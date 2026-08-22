import { prisma } from '../lib/prisma.js';

const SEED_IDS = {
  user: '11111111-1111-4111-8111-111111111111',
  passport: '22222222-2222-4222-8222-222222222222',
  charger: '33333333-3333-4333-8333-333333333333',
  trip: '44444444-4444-4444-8444-444444444444',
  bag: '55555555-5555-4555-8555-555555555555',
  passportBagItem: '66666666-6666-4666-8666-666666666666',
  chargerBagItem: '77777777-7777-4777-8777-777777777777',
} as const;

async function main() {
  const user = await prisma.user.upsert({
    where: {
      id: SEED_IDS.user,
    },
    update: {
      email: 'case@valizu.test',
      name: 'Valizu Case User',
    },
    create: {
      id: SEED_IDS.user,
      email: 'case@valizu.test',
      name: 'Valizu Case User',
    },
  });

  const passport = await prisma.item.upsert({
    where: {
      id: SEED_IDS.passport,
    },
    update: {
      userId: user.id,
      name: 'Passport',
      category: 'Documents',
    },
    create: {
      id: SEED_IDS.passport,
      userId: user.id,
      name: 'Passport',
      category: 'Documents',
    },
  });

  const charger = await prisma.item.upsert({
    where: {
      id: SEED_IDS.charger,
    },
    update: {
      userId: user.id,
      name: 'Phone Charger',
      category: 'Electronics',
    },
    create: {
      id: SEED_IDS.charger,
      userId: user.id,
      name: 'Phone Charger',
      category: 'Electronics',
    },
  });

  const trip = await prisma.trip.upsert({
    where: {
      id: SEED_IDS.trip,
    },
    update: {
      userId: user.id,
      name: 'Istanbul Trip',
      destination: 'Istanbul',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
    },
    create: {
      id: SEED_IDS.trip,
      userId: user.id,
      name: 'Istanbul Trip',
      destination: 'Istanbul',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
    },
  });

  const bag = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bag,
    },
    update: {
      tripId: trip.id,
      name: 'Carry-on',
    },
    create: {
      id: SEED_IDS.bag,
      tripId: trip.id,
      name: 'Carry-on',
    },
  });

  const passportBagItem = await prisma.bagItem.upsert({
    where: {
      bagId_itemId: {
        bagId: bag.id,
        itemId: passport.id,
      },
    },
    update: {
      quantity: 1,
    },
    create: {
      id: SEED_IDS.passportBagItem,
      bagId: bag.id,
      itemId: passport.id,
      quantity: 1,
    },
  });

  const chargerBagItem = await prisma.bagItem.upsert({
    where: {
      bagId_itemId: {
        bagId: bag.id,
        itemId: charger.id,
      },
    },
    update: {
      quantity: 1,
    },
    create: {
      id: SEED_IDS.chargerBagItem,
      bagId: bag.id,
      itemId: charger.id,
      quantity: 1,
    },
  });

  console.log({
    userId: user.id,
    tripId: trip.id,
    bagId: bag.id,
    passportItemId: passport.id,
    chargerItemId: charger.id,
    passportBagItemId: passportBagItem.id,
    chargerBagItemId: chargerBagItem.id,
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
