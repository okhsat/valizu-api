import { createHash } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.handler.js';
import { copyTripResultSchema, CopyTripResult } from './trip.schemas.js';

const COPY_TRIP_OPERATION = 'COPY_TRIP' as const;

function createRequestHash(sourceTripId: string): string {
  return createHash('sha256')
    .update(`${COPY_TRIP_OPERATION}:${sourceTripId}`)
    .digest('hex');
}

export async function copyTrip(
  userId: string,
  sourceTripId: string,
  idempotencyKey: string,

) {
  const requestHash = createRequestHash(sourceTripId);

  /*
   * We deliberately create the idempotency record inside the same
   * transaction as the copied resources.
   *
   * If another request with the same user + operation + key arrives
   * concurrently, the database unique constraint serializes access.
   *
   * The winner creates the copy.
   * The loser receives a unique-constraint error and returns the
   * already-completed result.
   */
  try {
    return await prisma.$transaction(async (tx) => {
      /*
       * The idempotency record and all copied resources belong
       * to the same transaction.
       *
       * The unique constraint:
       *
       *   (userId, operation, key)
       *
       * is the database-level concurrency guarantee.
       */
      const idempotency = await tx.idempotencyKey.create({
        data: {
          userId,
          key: idempotencyKey,
          operation: COPY_TRIP_OPERATION,
          requestHash,
          status: 'COMPLETED',
        },
      });

      const sourceTrip = await tx.trip.findFirst({
        where: {
          id: sourceTripId,
          userId,
        },
        include: {
          bags: {
            include: {
              items: true,
            },
          },
        },
      });

      if ( ! sourceTrip ) {
        throw new AppError(
          404,
          'TRIP_NOT_FOUND',
          'Trip not found',
        );
      }

      /*
       * Everything below is part of the same transaction.
       * If any operation fails, the copied trip, bags, items
       * and idempotency record are all rolled back.
       */
      const copiedTrip = await tx.trip.create({
        data: {
          userId,
          name: `Copy of ${sourceTrip.name}`,
          destination: sourceTrip.destination,
          startDate: sourceTrip.startDate,
          endDate: sourceTrip.endDate,
        },
      });

      const copiedBags: Array<{
        id: string;
        name: string;
        items: Array<{
          itemId: string;
          quantity: number;
        }>;
      }> = [];

      for ( const sourceBag of sourceTrip.bags ) {
        const copiedBag = await tx.bag.create({
          data: {
            tripId: copiedTrip.id,
            name: sourceBag.name,
          },
        });

        if ( sourceBag.items.length > 0 ) {
          await tx.bagItem.createMany({
            data: sourceBag.items.map((sourceBagItem) => ({
              bagId: copiedBag.id,
              itemId: sourceBagItem.itemId,
              quantity: sourceBagItem.quantity,
            })),
          });
        }

        copiedBags.push({
          id: copiedBag.id,
          name: copiedBag.name,
          items: sourceBag.items.map((sourceBagItem) => ({
            itemId: sourceBagItem.itemId,
            quantity: sourceBagItem.quantity,
          })),
        });
      }

      const result: CopyTripResult = {
        id: copiedTrip.id,
        name: copiedTrip.name,
        destination: copiedTrip.destination,
        startDate: copiedTrip.startDate?.toISOString() ?? null,
        endDate: copiedTrip.endDate?.toISOString() ?? null,
        bags: copiedBags,
      };

      /*
       * Store the exact response so a retry can return the
       * original successful result rather than creating anything.
       */
      await tx.idempotencyKey.update({
        where: {
          id: idempotency.id,
        },
        data: {
          resourceId: copiedTrip.id,
          responseBody: result,
          completedAt: new Date(),
        },
      });

      return result;
    });

  } catch (error) {
    /*
     * A concurrent request using the same:
     *
     *   userId + operation + idempotencyKey
     *
     * may lose the database unique constraint.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existing = await prisma.idempotencyKey.findUnique({
        where: {
          userId_operation_key: {
            userId,
            operation: COPY_TRIP_OPERATION,
            key: idempotencyKey,
          },
        },
      });

      /*
       * This should be extremely unusual, but don't silently
       * convert an unrelated uniqueness error into an idempotency
       * response.
       */
      if ( ! existing ) {
        throw error;
      }

      /*
       * The same key must represent the same logical request.
       */
      if ( existing.requestHash !== requestHash ) {
        throw new AppError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'The Idempotency-Key was already used for a different copy request',
        );
      }

      /*
       * Because the idempotency record is created and completed
       * inside the same transaction as the copy, a committed
       * record represents a completed operation.
       */
      if (
        existing.status === 'COMPLETED' &&
        existing.responseBody
      ) {
        return copyTripResultSchema.parse(existing.responseBody);
      }

      /*
       * Defensive fallback. With the current transaction design,
       * an observable committed non-completed record should not
       * normally occur.
       */
      throw new AppError(
        409,
        'IDEMPOTENCY_REQUEST_IN_PROGRESS',
        'The same copy request is currently being processed',
      );
    }

    throw error;
  }
}
