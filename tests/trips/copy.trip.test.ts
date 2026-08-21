import crypto from 'node:crypto';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { copyTrip } from '../../src/modules/trips/trip.service.js';

describe('copyTrip idempotency', () => {
  let userId: string;
  let sourceTripId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `copy-trip-test-${crypto.randomUUID()}@valizu.test`,
        name: 'Copy Trip Test User',
      },
    });

    userId = user.id;
  });

  beforeEach(async () => {
    await prisma.idempotencyKey.deleteMany({
      where: {
        userId,
      },
    });

    await prisma.bagItem.deleteMany({
      where: {
        bag: {
          trip: {
            userId,
          },
        },
      },
    });

    await prisma.bag.deleteMany({
      where: {
        trip: {
          userId,
        },
      },
    });

    await prisma.trip.deleteMany({
      where: {
        userId,
      },
    });

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: 'Test Istanbul Trip',
        destination: 'Istanbul',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
      },
    });

    sourceTripId = trip.id;
  });

  afterAll(async () => {
    await prisma.idempotencyKey.deleteMany({
      where: {
        userId,
      },
    });

    await prisma.bag.deleteMany({
      where: {
        trip: {
          userId,
        },
      },
    });

    await prisma.trip.deleteMany({
      where: {
        userId,
      },
    });

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    await prisma.$disconnect();
  });

  it('returns the same copied trip for concurrent requests with the same idempotency key', async () => {
    const idempotencyKey = `copy-trip-${Date.now()}`;

    const [first, second] = await Promise.all([
      copyTrip(userId, sourceTripId, idempotencyKey),
      copyTrip(userId, sourceTripId, idempotencyKey),
    ]);

    expect(first).toEqual(second);
    expect(first.id).toBe(second.id);

    expect(first.name).toBe('Copy of Test Istanbul Trip');
    expect(second.name).toBe('Copy of Test Istanbul Trip');

    const copiedTrips = await prisma.trip.findMany({
      where: {
        userId,
        id: {
          not: sourceTripId,
        },
      },
    });

    expect(copiedTrips).toHaveLength(1);

    const idempotencyRecords = await prisma.idempotencyKey.findMany({
      where: {
        userId,
        key: idempotencyKey,
        operation: 'COPY_TRIP',
      },
    });

    expect(idempotencyRecords).toHaveLength(1);
    expect(idempotencyRecords[0]?.status).toBe('COMPLETED');
    expect(idempotencyRecords[0]?.resourceId).toBe(first.id);
  });

  it('rejects reusing an idempotency key for a different source trip', async () => {
    const secondTrip = await prisma.trip.create({
      data: {
        userId,
        name: 'Second Trip',
        destination: 'Ankara',
      },
    });

    const idempotencyKey = `copy-trip-reuse-${Date.now()}`;

    await copyTrip(
      userId,
      sourceTripId,
      idempotencyKey,
    );

    await expect(
      copyTrip(
        userId,
        secondTrip.id,
        idempotencyKey,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'IDEMPOTENCY_KEY_REUSED',
    });

    const trips = await prisma.trip.findMany({
      where: {
        userId,
      },
    });

    expect(trips).toHaveLength(3);
  });

  it('does not consume the idempotency key when the copy fails', async () => {
    const idempotencyKey = `copy-trip-failure-${Date.now()}`;

    await expect(
      copyTrip(
        userId,
        crypto.randomUUID(),
        idempotencyKey,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: 'TRIP_NOT_FOUND',
    });

    const record = await prisma.idempotencyKey.findUnique({
      where: {
        userId_operation_key: {
          userId,
          operation: 'COPY_TRIP',
          key: idempotencyKey,
        },
      },
    });

    expect(record).toBeNull();
  });

  it('returns the original result when a completed request is retried', async () => {
    const idempotencyKey = `copy-trip-retry-${crypto.randomUUID()}`;

    const first = await copyTrip(
      userId,
      sourceTripId,
      idempotencyKey,
    );

    const second = await copyTrip(
      userId,
      sourceTripId,
      idempotencyKey,
    );

    expect(second).toEqual(first);

    const copiedTrips = await prisma.trip.findMany({
      where: {
        userId,
        id: {
          not: sourceTripId,
        },
      },
    });

    expect(copiedTrips).toHaveLength(1);
  });
});
