import crypto from 'node:crypto';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
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
    /*
     * Clean all test data belonging to this user.
     *
     * Foreign-key order:
     *
     *   BagItem -> Bag -> Trip
     */
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

    /*
     * Items are independent of trips, so remove the user's
     * test items before recreating the fixture.
     */
    await prisma.item.deleteMany({
      where: {
        userId,
      },
    });

    /*
     * ---------------------------------------------------------
     * Create test items
     * ---------------------------------------------------------
     */
    const passport = await prisma.item.create({
      data: {
        userId,
        name: 'Passport',
        category: 'Documents',
      },
    });

    const charger = await prisma.item.create({
      data: {
        userId,
        name: 'Phone Charger',
        category: 'Electronics',
      },
    });

    const shoes = await prisma.item.create({
      data: {
        userId,
        name: 'Running Shoes',
        category: 'Clothing',
      },
    });

    /*
     * ---------------------------------------------------------
     * Create source trip
     * ---------------------------------------------------------
     *
     * Test fixture:
     *
     * Test Istanbul Trip
     * ├── Carry-on
     * │   ├── Passport × 1
     * │   └── Phone Charger × 2
     * │
     * └── Checked Bag
     *     └── Running Shoes × 1
     */
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

    const carryOn = await prisma.bag.create({
      data: {
        tripId: trip.id,
        name: 'Carry-on',
      },
    });

    const checkedBag = await prisma.bag.create({
      data: {
        tripId: trip.id,
        name: 'Checked Bag',
      },
    });

    await prisma.bagItem.createMany({
      data: [
        {
          bagId: carryOn.id,
          itemId: passport.id,
          quantity: 1,
        },
        {
          bagId: carryOn.id,
          itemId: charger.id,
          quantity: 2,
        },
        {
          bagId: checkedBag.id,
          itemId: shoes.id,
          quantity: 1,
        },
      ],
    });
  });

  afterAll(async () => {
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

    await prisma.item.deleteMany({
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
    const idempotencyKey = `copy-trip-${crypto.randomUUID()}`;

    const [first, second] = await Promise.all([
      copyTrip(userId, sourceTripId, idempotencyKey),
      copyTrip(userId, sourceTripId, idempotencyKey),
    ]);

    /*
     * Both concurrent requests must receive exactly
     * the same response.
     */
    expect(first).toEqual(second);
    expect(first.id).toBe(second.id);

    expect(first.name).toBe('Copy of Test Istanbul Trip');

    /*
     * The copied response must contain the complete
     * bag/item hierarchy.
     */
    expect(first.bags).toHaveLength(2);

    expect(first.bags[0]).toMatchObject({
      name: 'Carry-on',
    });

    expect(first.bags[0]?.items).toEqual(
      expect.arrayContaining([
        {
          itemId: expect.any(String),
          quantity: 1,
        },
        {
          itemId: expect.any(String),
          quantity: 2,
        },
      ]),
    );

    expect(first.bags[1]).toMatchObject({
      name: 'Checked Bag',
    });

    expect(first.bags[1]?.items).toHaveLength(1);
    expect(first.bags[1]?.items[0]?.quantity).toBe(1);

    /*
     * Only ONE copied trip must exist.
     *
     * If both concurrent requests had created a copy,
     * this would be 2.
     */
    const copiedTrips = await prisma.trip.findMany({
      where: {
        userId,
        id: {
          not: sourceTripId,
        },
      },
    });

    expect(copiedTrips).toHaveLength(1);

    /*
     * Verify the actual database hierarchy as well.
     */
    const copiedTrip = await prisma.trip.findUnique({
      where: {
        id: first.id,
      },
      include: {
        bags: {
          include: {
            items: true,
          },
        },
      },
    });

    expect(copiedTrip).not.toBeNull();
    expect(copiedTrip?.bags).toHaveLength(2);

    const carryOn = copiedTrip?.bags.find(
      (bag) => bag.name === 'Carry-on',
    );

    const checkedBag = copiedTrip?.bags.find(
      (bag) => bag.name === 'Checked Bag',
    );

    expect(carryOn).toBeDefined();
    expect(checkedBag).toBeDefined();

    expect(carryOn?.items).toHaveLength(2);
    expect(checkedBag?.items).toHaveLength(1);

    /*
     * The copied bags must have different IDs from the
     * source bags, while preserving their contents.
     */
    const sourceTrip = await prisma.trip.findUnique({
      where: {
        id: sourceTripId,
      },
      include: {
        bags: {
          include: {
            items: true,
          },
        },
      },
    });

    expect(sourceTrip).not.toBeNull();

    expect(
      copiedTrip?.bags.map((bag) => bag.id),
    ).not.toEqual(
      sourceTrip?.bags.map((bag) => bag.id),
    );

    /*
     * Only one idempotency record should exist.
     */
    const idempotencyRecords =
      await prisma.idempotencyKey.findMany({
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

    const idempotencyKey =
      `copy-trip-reuse-${crypto.randomUUID()}`;

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

    const copiedTrips = await prisma.trip.findMany({
      where: {
        userId,
        id: {
          not: sourceTripId,
        },
      },
    });

    /*
     * secondTrip + the first successful copy.
     */
    expect(copiedTrips).toHaveLength(2);
  });

  it('does not consume the idempotency key when the copy fails', async () => {
    const idempotencyKey =
      `copy-trip-failure-${crypto.randomUUID()}`;

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

    /*
     * Because the idempotency record and the copy operation
     * are in the same transaction, the failed transaction
     * rolls the idempotency record back.
     */
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
    const idempotencyKey =
      `copy-trip-retry-${crypto.randomUUID()}`;

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

    /*
     * The second request must return the stored response,
     * not execute another copy.
     */
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

    /*
     * Also verify that the copied hierarchy still exists.
     */
    const copiedTrip = await prisma.trip.findUnique({
      where: {
        id: first.id,
      },
      include: {
        bags: {
          include: {
            items: true,
          },
        },
      },
    });

    expect(copiedTrip?.bags).toHaveLength(2);
    expect(
      copiedTrip?.bags.reduce(
        (total, bag) => total + bag.items.length,
        0,
      ),
    ).toBe(3);
  });
});
