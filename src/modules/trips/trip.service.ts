import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.handler.js';
import {
  copyTripResultSchema,
  CopyTripResult,
} from './trip.schemas.js';

const COPY_TRIP_OPERATION = 'COPY_TRIP' as const;

export async function listTrips(userId: string) {
  return prisma.trip.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

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

      const copiedTrip = await tx.trip.create({
        data: {
          userId,
          name: `Copy of ${sourceTrip.name}`,
          destination: sourceTrip.destination,
          startDate: sourceTrip.startDate,
          endDate: sourceTrip.endDate,
        },
      });

      /*
       * Generate IDs in application memory so the IDs are known
       * before bulk-inserting dependent BagItem records.
       */
      const bagCreates = sourceTrip.bags.map((sourceBag) => ({
        id: randomUUID(),
        tripId: copiedTrip.id,
        name: sourceBag.name,
      }));

      if ( bagCreates.length > 0 ) {
        await tx.bag.createMany({
          data: bagCreates,
        });
      }

      const bagItemCreates = sourceTrip.bags.flatMap(
        (sourceBag, index) =>
          sourceBag.items.map((sourceBagItem) => ({
            bagId: bagCreates[index]!.id,
            itemId: sourceBagItem.itemId,
            quantity: sourceBagItem.quantity,
          })),
      );

      if ( bagItemCreates.length > 0 ) {
        await tx.bagItem.createMany({
          data: bagItemCreates,
        });
      }

      const result: CopyTripResult = {
        id: copiedTrip.id,
        name: copiedTrip.name,
        destination: copiedTrip.destination,
        startDate:
          copiedTrip.startDate?.toISOString() ?? null,
        endDate:
          copiedTrip.endDate?.toISOString() ?? null,
        bags: bagCreates.map((bag, index) => ({
          id: bag.id,
          name: bag.name,
          items: sourceTrip.bags[index]!.items.map(
            (sourceBagItem) => ({
              itemId: sourceBagItem.itemId,
              quantity: sourceBagItem.quantity,
            }),
          ),
        })),
      };

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

      if ( ! existing ) {
        throw error;
      }

      if (existing.requestHash !== requestHash) {
        throw new AppError(
          409,
          'IDEMPOTENCY_KEY_REUSED',
          'The Idempotency-Key was already used for a different copy request',
        );
      }

      if (
        existing.status === 'COMPLETED' &&
        existing.responseBody
      ) {
        return copyTripResultSchema.parse(
          existing.responseBody,
        );
      }

      throw new AppError(
        409,
        'IDEMPOTENCY_REQUEST_IN_PROGRESS',
        'The same copy request is currently being processed',
      );
    }

    throw error;
  }
}
