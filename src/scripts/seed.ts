import { prisma } from '../lib/prisma.js';

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: 'case@valizu.test',
    },
    update: {},
    create: {
      email: 'case@valizu.test',
      name: 'Valizu Case User',
    },
  });

  const passport = await prisma.item.create({
    data: {
      userId: user.id,
      name: 'Passport',
      category: 'Documents',
    },
  });

  const charger = await prisma.item.create({
    data: {
      userId: user.id,
      name: 'Phone Charger',
      category: 'Electronics',
    },
  });

  const trip = await prisma.trip.create({
    data: {
      userId: user.id,
      name: 'Istanbul Trip',
      destination: 'Istanbul',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
    },
  });

  const bag = await prisma.bag.create({
    data: {
      tripId: trip.id,
      name: 'Carry-on',
    },
  });

  await prisma.bagItem.createMany({
    data: [
      {
        bagId: bag.id,
        itemId: passport.id,
        quantity: 1,
      },
      {
        bagId: bag.id,
        itemId: charger.id,
        quantity: 1,
      },
    ],
  });

  console.log({
    userId: user.id,
    tripId: trip.id,
    bagId: bag.id,
    passportItemId: passport.id,
    chargerItemId: charger.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
