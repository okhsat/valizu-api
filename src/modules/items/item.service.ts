import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error.handler.js';

export async function listItems(userId: string) {
  return prisma.item.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function listBagItems(
  userId: string,
  bagId: string,
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

  return prisma.bagItem.findMany({
    where: {
      bagId,
    },
    include: {
      item: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function addItemToBag(
  userId: string,
  bagId: string,
  itemId: string,
  quantity: number,
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

  const item = await prisma.item.findFirst({
    where: {
      id: itemId,
      userId,
    },
  });

  if (!item) {
    throw new AppError(
      404,
      'ITEM_NOT_FOUND',
      'Item not found',
    );
  }

  return prisma.bagItem.upsert({
    where: {
      bagId_itemId: {
        bagId,
        itemId,
      },
    },
    create: {
      bagId,
      itemId,
      quantity,
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
    include: {
      item: true,
    },
  });
}

export async function removeItemFromBag(
  userId: string,
  bagId: string,
  itemId: string,
) {
  const bagItem = await prisma.bagItem.findFirst({
    where: {
      bagId,
      itemId,
      bag: {
        trip: {
          userId,
        },
      },
    },
  });

  if (!bagItem) {
    throw new AppError(
      404,
      'BAG_ITEM_NOT_FOUND',
      'Item is not present in this bag',
    );
  }

  await prisma.bagItem.delete({
    where: {
      id: bagItem.id,
    },
  });
}
