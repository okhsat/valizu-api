import { prisma } from '../../lib/prisma.js';

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });
}
