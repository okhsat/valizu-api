import { prisma } from '../lib/prisma.js';

const SEED_IDS = {
  user: '11111111-1111-4111-8111-111111111111',

  items: {
    passport: '22222222-2222-4222-8222-222222222222',
    charger: '33333333-3333-4333-8333-333333333333',
    laptop: '88888888-8888-4888-8888-888888888888',
    headphones: '99999999-9999-4999-8999-999999999999',
    wallet: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    clothes: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    toothbrush: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    camera: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  },

  trips: {
    istanbul: '44444444-4444-4444-8444-444444444444',
    paris: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    london: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  },

  bags: {
    istanbulCarryOn: '55555555-5555-4555-8555-555555555555',
    istanbulChecked: '12121212-1212-4121-8121-121212121212',

    parisCarryOn: '13131313-1313-4131-8131-131313131313',
    parisCamera: '14141414-1414-4141-8141-141414141414',

    londonCarryOn: '15151515-1515-4151-8151-151515151515',
    londonChecked: '16161616-1616-4161-8161-161616161616',
  },

  bagItems: {
    istanbulPassport: '66666666-6666-4666-8666-666666666666',
    istanbulCharger: '77777777-7777-4777-8777-777777777777',
    istanbulLaptop: '17171717-1717-4171-8171-171717171717',
    istanbulHeadphones: '18181818-1818-4181-8181-181818181818',
    istanbulClothes: '19191919-1919-4191-8191-191919191919',

    parisPassport: '20202020-2020-4202-8202-202020202020',
    parisCamera: '21212121-2121-4212-8212-212121212121',
    parisHeadphones: '22222222-2222-4222-8222-222222222223',
    parisWallet: '23232323-2323-4232-8232-232323232323',

    londonPassport: '24242424-2424-4242-8242-242424242424',
    londonLaptop: '25252525-2525-4252-8252-252525252525',
    londonCharger: '26262626-2626-4262-8262-262626262626',
    londonToothbrush: '27272727-2727-4272-8272-272727272727',
  },
} as const;

async function main() {
  /*
   * ---------------------------------------------------------
   * USER
   * ---------------------------------------------------------
   */

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

  /*
   * ---------------------------------------------------------
   * ITEMS
   * ---------------------------------------------------------
   */

  const passport = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.passport,
    },
    update: {
      userId: user.id,
      name: 'Passport',
      category: 'Documents',
    },
    create: {
      id: SEED_IDS.items.passport,
      userId: user.id,
      name: 'Passport',
      category: 'Documents',
    },
  });

  const charger = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.charger,
    },
    update: {
      userId: user.id,
      name: 'Phone Charger',
      category: 'Electronics',
    },
    create: {
      id: SEED_IDS.items.charger,
      userId: user.id,
      name: 'Phone Charger',
      category: 'Electronics',
    },
  });

  const laptop = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.laptop,
    },
    update: {
      userId: user.id,
      name: 'Laptop',
      category: 'Electronics',
    },
    create: {
      id: SEED_IDS.items.laptop,
      userId: user.id,
      name: 'Laptop',
      category: 'Electronics',
    },
  });

  const headphones = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.headphones,
    },
    update: {
      userId: user.id,
      name: 'Headphones',
      category: 'Electronics',
    },
    create: {
      id: SEED_IDS.items.headphones,
      userId: user.id,
      name: 'Headphones',
      category: 'Electronics',
    },
  });

  const wallet = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.wallet,
    },
    update: {
      userId: user.id,
      name: 'Wallet',
      category: 'Personal',
    },
    create: {
      id: SEED_IDS.items.wallet,
      userId: user.id,
      name: 'Wallet',
      category: 'Personal',
    },
  });

  const clothes = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.clothes,
    },
    update: {
      userId: user.id,
      name: 'Clothes',
      category: 'Clothing',
    },
    create: {
      id: SEED_IDS.items.clothes,
      userId: user.id,
      name: 'Clothes',
      category: 'Clothing',
    },
  });

  const toothbrush = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.toothbrush,
    },
    update: {
      userId: user.id,
      name: 'Toothbrush',
      category: 'Personal Care',
    },
    create: {
      id: SEED_IDS.items.toothbrush,
      userId: user.id,
      name: 'Toothbrush',
      category: 'Personal Care',
    },
  });

  const camera = await prisma.item.upsert({
    where: {
      id: SEED_IDS.items.camera,
    },
    update: {
      userId: user.id,
      name: 'Camera',
      category: 'Electronics',
    },
    create: {
      id: SEED_IDS.items.camera,
      userId: user.id,
      name: 'Camera',
      category: 'Electronics',
    },
  });

  /*
   * ---------------------------------------------------------
   * TRIPS
   * ---------------------------------------------------------
   */

  const istanbulTrip = await prisma.trip.upsert({
    where: {
      id: SEED_IDS.trips.istanbul,
    },
    update: {
      userId: user.id,
      name: 'Istanbul Trip',
      destination: 'Istanbul',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
    },
    create: {
      id: SEED_IDS.trips.istanbul,
      userId: user.id,
      name: 'Istanbul Trip',
      destination: 'Istanbul',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-05'),
    },
  });

  const parisTrip = await prisma.trip.upsert({
    where: {
      id: SEED_IDS.trips.paris,
    },
    update: {
      userId: user.id,
      name: 'Paris Trip',
      destination: 'Paris',
      startDate: new Date('2026-10-10'),
      endDate: new Date('2026-10-15'),
    },
    create: {
      id: SEED_IDS.trips.paris,
      userId: user.id,
      name: 'Paris Trip',
      destination: 'Paris',
      startDate: new Date('2026-10-10'),
      endDate: new Date('2026-10-15'),
    },
  });

  const londonTrip = await prisma.trip.upsert({
    where: {
      id: SEED_IDS.trips.london,
    },
    update: {
      userId: user.id,
      name: 'London Trip',
      destination: 'London',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-07'),
    },
    create: {
      id: SEED_IDS.trips.london,
      userId: user.id,
      name: 'London Trip',
      destination: 'London',
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-07'),
    },
  });

  /*
   * ---------------------------------------------------------
   * BAGS
   * ---------------------------------------------------------
   */

  const istanbulCarryOn = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.istanbulCarryOn,
    },
    update: {
      tripId: istanbulTrip.id,
      name: 'Carry-on',
    },
    create: {
      id: SEED_IDS.bags.istanbulCarryOn,
      tripId: istanbulTrip.id,
      name: 'Carry-on',
    },
  });

  const istanbulChecked = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.istanbulChecked,
    },
    update: {
      tripId: istanbulTrip.id,
      name: 'Checked Luggage',
    },
    create: {
      id: SEED_IDS.bags.istanbulChecked,
      tripId: istanbulTrip.id,
      name: 'Checked Luggage',
    },
  });

  const parisCarryOn = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.parisCarryOn,
    },
    update: {
      tripId: parisTrip.id,
      name: 'Carry-on',
    },
    create: {
      id: SEED_IDS.bags.parisCarryOn,
      tripId: parisTrip.id,
      name: 'Carry-on',
    },
  });

  const parisCamera = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.parisCamera,
    },
    update: {
      tripId: parisTrip.id,
      name: 'Camera Bag',
    },
    create: {
      id: SEED_IDS.bags.parisCamera,
      tripId: parisTrip.id,
      name: 'Camera Bag',
    },
  });

  const londonCarryOn = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.londonCarryOn,
    },
    update: {
      tripId: londonTrip.id,
      name: 'Carry-on',
    },
    create: {
      id: SEED_IDS.bags.londonCarryOn,
      tripId: londonTrip.id,
      name: 'Carry-on',
    },
  });

  const londonChecked = await prisma.bag.upsert({
    where: {
      id: SEED_IDS.bags.londonChecked,
    },
    update: {
      tripId: londonTrip.id,
      name: 'Checked Luggage',
    },
    create: {
      id: SEED_IDS.bags.londonChecked,
      tripId: londonTrip.id,
      name: 'Checked Luggage',
    },
  });

  /*
   * ---------------------------------------------------------
   * BAG ITEMS
   * ---------------------------------------------------------
   */

  const createBagItem = async (
    id: string,
    bagId: string,
    itemId: string,
    quantity: number,
  ) => {
    return prisma.bagItem.upsert({
      where: {
        bagId_itemId: {
          bagId,
          itemId,
        },
      },
      update: {
        quantity,
      },
      create: {
        id,
        bagId,
        itemId,
        quantity,
      },
    });
  };

  await createBagItem(
    SEED_IDS.bagItems.istanbulPassport,
    istanbulCarryOn.id,
    passport.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.istanbulCharger,
    istanbulCarryOn.id,
    charger.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.istanbulLaptop,
    istanbulCarryOn.id,
    laptop.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.istanbulHeadphones,
    istanbulCarryOn.id,
    headphones.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.istanbulClothes,
    istanbulChecked.id,
    clothes.id,
    5,
  );

  await createBagItem(
    SEED_IDS.bagItems.parisPassport,
    parisCarryOn.id,
    passport.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.parisCamera,
    parisCamera.id,
    camera.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.parisHeadphones,
    parisCamera.id,
    headphones.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.parisWallet,
    parisCarryOn.id,
    wallet.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.londonPassport,
    londonCarryOn.id,
    passport.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.londonLaptop,
    londonCarryOn.id,
    laptop.id,
    1,
  );

  await createBagItem(
    SEED_IDS.bagItems.londonCharger,
    londonCarryOn.id,
    charger.id,
    2,
  );

  await createBagItem(
    SEED_IDS.bagItems.londonToothbrush,
    londonCarryOn.id,
    toothbrush.id,
    1,
  );

  /*
   * ---------------------------------------------------------
   * OUTPUT
   * ---------------------------------------------------------
   */

  console.log('Seed completed successfully.');
  console.log({
    userId: user.id,
    trips: {
      istanbul: istanbulTrip.id,
      paris: parisTrip.id,
      london: londonTrip.id,
    },
    bags: {
      istanbulCarryOn: istanbulCarryOn.id,
      istanbulChecked: istanbulChecked.id,
      parisCarryOn: parisCarryOn.id,
      parisCamera: parisCamera.id,
      londonCarryOn: londonCarryOn.id,
      londonChecked: londonChecked.id,
    },
    itemIds: {
      passport: passport.id,
      charger: charger.id,
      laptop: laptop.id,
      headphones: headphones.id,
      wallet: wallet.id,
      clothes: clothes.id,
      toothbrush: toothbrush.id,
      camera: camera.id,
    },
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
