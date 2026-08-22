import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.handler.js';

export async function listBags(
  userId: string,
  tripId: string,
) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      userId,
    },
  });

  if (!trip) {
    throw new AppError(
      404,
      'TRIP_NOT_FOUND',
      'Trip not found',
    );
  }

  return prisma.bag.findMany({
    where: {
      tripId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function createBag(
  userId: string,
  tripId: string,
  name: string,
) {
  const trip = await prisma.trip.findFirst({
    where: {
      id: tripId,
      userId,
    },
  });

  if (!trip) {
    throw new AppError(
      404,
      'TRIP_NOT_FOUND',
      'Trip not found',
    );
  }

  return prisma.bag.create({
    data: {
      tripId,
      name,
    },
  });
}

export async function updateBag(
  userId: string,
  bagId: string,
  name: string,
) {
  const bag = await prisma.bag.findFirst({
    where: {
      id: bagId,
      trip: {
        userId,
      },
    },
  });

  if (!bag) {
    throw new AppError(
      404,
      'BAG_NOT_FOUND',
      'Bag not found',
    );
  }

  return prisma.bag.update({
    where: {
      id: bagId,
    },
    data: {
      name,
    },
  });
}
