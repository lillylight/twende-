import {
  PrismaClient,
  UserRole,
  JourneyStatus,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

function generateRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'ZP-';
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

function generateTrackingToken(): string {
  const chars = 'abcdef0123456789';
  let token = '';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

async function main() {
  console.log('Seeding ZedPulse database...');

  // Clean existing data in dependency order
  await prisma.rating.deleteMany();
  await prisma.sOSEvent.deleteMany();
  await prisma.safetyAlert.deleteMany();
  await prisma.gPSLog.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.journey.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.route.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data.');

  const passwordHash = await bcrypt.hash('ZedPulse2026!', 12);

  // ─── Operators ───────────────────────────────────────────────────────────

  const operators = await Promise.all([
    prisma.operator.create({
      data: {
        id: uuidv4(),
        name: 'Power Tools Bus Services',
        rtsaLicenceNumber: 'RTSA-OP-2024-00147',
        licenceExpiry: new Date('2027-06-30'),
        contactPhone: '+260955100200',
        contactEmail: 'ops@powertoolsbus.co.zm',
        complianceScore: 7.8,
        isActive: true,
      },
    }),
    prisma.operator.create({
      data: {
        id: uuidv4(),
        name: 'Mazhandu Family Bus Services',
        rtsaLicenceNumber: 'RTSA-OP-2023-00089',
        licenceExpiry: new Date('2026-12-31'),
        contactPhone: '+260966200300',
        contactEmail: 'bookings@mazhandu.co.zm',
        complianceScore: 8.5,
        isActive: true,
      },
    }),
    prisma.operator.create({
      data: {
        id: uuidv4(),
        name: 'Juldan Motors',
        rtsaLicenceNumber: 'RTSA-OP-2024-00213',
        licenceExpiry: new Date('2027-03-15'),
        contactPhone: '+260977300400',
        contactEmail: 'info@juldanmotors.co.zm',
        complianceScore: 6.9,
        isActive: true,
      },
    }),
  ]);

  const [powerTools, mazhandu, juldan] = operators;
  console.log(`Created ${operators.length} operators.`);

  // ─── Driver Users ────────────────────────────────────────────────────────

  const driverUsers = await Promise.all([
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260955501001',
        name: 'Moses Banda',
        email: 'moses.banda@powertoolsbus.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '123456/78/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260966502002',
        name: 'Chanda Mwila',
        email: 'chanda.mwila@powertoolsbus.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '234567/89/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260977503003',
        name: 'Joseph Phiri',
        email: 'joseph.phiri@mazhandu.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '345678/90/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260955504004',
        name: 'Bwalya Mulenga',
        email: 'bwalya.mulenga@mazhandu.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '456789/01/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260966505005',
        name: 'Emmanuel Zulu',
        email: 'emmanuel.zulu@juldanmotors.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '567890/12/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260977506006',
        name: 'Patrick Tembo',
        email: 'patrick.tembo@juldanmotors.co.zm',
        passwordHash,
        role: UserRole.DRIVER,
        nrc: '678901/23/1',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${driverUsers.length} driver users.`);

  // ─── Drivers ─────────────────────────────────────────────────────────────

  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[0].id,
        operatorId: powerTools.id,
        licenceNumber: 'DL-2020-ZM-04521',
        licenceExpiry: new Date('2027-08-15'),
        rating: 4.6,
        totalTrips: 342,
        isActive: true,
      },
    }),
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[1].id,
        operatorId: powerTools.id,
        licenceNumber: 'DL-2019-ZM-03298',
        licenceExpiry: new Date('2026-11-20'),
        rating: 4.3,
        totalTrips: 287,
        isActive: true,
      },
    }),
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[2].id,
        operatorId: mazhandu.id,
        licenceNumber: 'DL-2021-ZM-05610',
        licenceExpiry: new Date('2028-01-10'),
        rating: 4.8,
        totalTrips: 510,
        isActive: true,
      },
    }),
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[3].id,
        operatorId: mazhandu.id,
        licenceNumber: 'DL-2018-ZM-02145',
        licenceExpiry: new Date('2027-05-30'),
        rating: 4.5,
        totalTrips: 423,
        isActive: true,
      },
    }),
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[4].id,
        operatorId: juldan.id,
        licenceNumber: 'DL-2022-ZM-06789',
        licenceExpiry: new Date('2028-04-25'),
        rating: 4.1,
        totalTrips: 156,
        isActive: true,
      },
    }),
    prisma.driver.create({
      data: {
        id: uuidv4(),
        userId: driverUsers[5].id,
        operatorId: juldan.id,
        licenceNumber: 'DL-2020-ZM-04100',
        licenceExpiry: new Date('2027-09-12'),
        rating: 4.4,
        totalTrips: 298,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${drivers.length} drivers.`);

  // ─── Routes ──────────────────────────────────────────────────────────────

  const routes = await Promise.all([
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Lusaka',
        toCity: 'Ndola',
        distanceKm: 325,
        estimatedDurationMinutes: 270,
        waypoints: JSON.stringify(['Kapiri Mposhi', 'Serenje Turnoff', 'Mpika Turnoff']),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Lusaka',
        toCity: 'Livingstone',
        distanceKm: 472,
        estimatedDurationMinutes: 360,
        waypoints: JSON.stringify(['Kafue', 'Mazabuka', 'Monze', 'Choma', 'Kalomo', 'Zimba']),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Lusaka',
        toCity: 'Chipata',
        distanceKm: 574,
        estimatedDurationMinutes: 420,
        waypoints: JSON.stringify(['Luangwa Bridge', 'Nyimba', 'Petauke', 'Sinda']),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Lusaka',
        toCity: 'Kabwe',
        distanceKm: 139,
        estimatedDurationMinutes: 105,
        waypoints: JSON.stringify([]),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Lusaka',
        toCity: 'Kitwe',
        distanceKm: 360,
        estimatedDurationMinutes: 300,
        waypoints: JSON.stringify(['Kapiri Mposhi', 'Ndola']),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Ndola',
        toCity: 'Kitwe',
        distanceKm: 56,
        estimatedDurationMinutes: 50,
        waypoints: JSON.stringify([]),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Livingstone',
        toCity: 'Lusaka',
        distanceKm: 472,
        estimatedDurationMinutes: 360,
        waypoints: JSON.stringify(['Zimba', 'Kalomo', 'Choma', 'Monze', 'Mazabuka', 'Kafue']),
        isActive: true,
      },
    }),
    prisma.route.create({
      data: {
        id: uuidv4(),
        fromCity: 'Ndola',
        toCity: 'Lusaka',
        distanceKm: 325,
        estimatedDurationMinutes: 270,
        waypoints: JSON.stringify(['Mpika Turnoff', 'Serenje Turnoff', 'Kapiri Mposhi']),
        isActive: true,
      },
    }),
  ]);

  const [
    lusakaNdola,
    lusakaLivingstone,
    lusakaChipata,
    lusakaKabwe,
    lusakaKitwe,
    ndolaKitwe,
    livingstoneLusaka,
    ndolaLusaka,
  ] = routes;

  console.log(`Created ${routes.length} routes.`);

  // ─── Passengers ──────────────────────────────────────────────────────────

  const passengers = await Promise.all([
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260955700101',
        name: 'Mwansa Chilufya',
        email: 'mwansa.c@gmail.com',
        passwordHash,
        role: UserRole.PASSENGER,
        nrc: '111222/33/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260966700202',
        name: 'Thandiwe Sakala',
        email: 'thandiwe.sakala@yahoo.com',
        passwordHash,
        role: UserRole.PASSENGER,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260977700303',
        name: 'Kelvin Mwamba',
        email: 'kelvin.mwamba@outlook.com',
        passwordHash,
        role: UserRole.PASSENGER,
        nrc: '333444/55/1',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260955700404',
        name: 'Naomi Mutale',
        passwordHash,
        role: UserRole.PASSENGER,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv4(),
        phone: '+260966700505',
        name: 'David Lungu',
        email: 'dlungu@gmail.com',
        passwordHash,
        role: UserRole.PASSENGER,
        nrc: '555666/77/1',
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${passengers.length} passengers.`);

  // ─── Journeys ────────────────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day1 = addDays(today, 0);
  const day2 = addDays(today, 1);
  const day3 = addDays(today, 2);

  interface JourneySeed {
    route: (typeof routes)[0];
    operator: (typeof operators)[0];
    driver: (typeof drivers)[0];
    bus: string;
    departure: Date;
    totalSeats: number;
    availableSeats: number;
    price: number;
    status: JourneyStatus;
  }

  const journeySeeds: JourneySeed[] = [
    // Day 1 journeys
    {
      route: lusakaNdola,
      operator: powerTools,
      driver: drivers[0],
      bus: 'BAA 1234 ZM',
      departure: setTime(day1, 6, 0),
      totalSeats: 52,
      availableSeats: 12,
      price: 250,
      status: JourneyStatus.EN_ROUTE,
    },
    {
      route: lusakaLivingstone,
      operator: mazhandu,
      driver: drivers[2],
      bus: 'BAB 5678 ZM',
      departure: setTime(day1, 7, 30),
      totalSeats: 48,
      availableSeats: 5,
      price: 350,
      status: JourneyStatus.EN_ROUTE,
    },
    {
      route: lusakaKabwe,
      operator: juldan,
      driver: drivers[4],
      bus: 'BAC 9012 ZM',
      departure: setTime(day1, 8, 0),
      totalSeats: 44,
      availableSeats: 20,
      price: 150,
      status: JourneyStatus.BOARDING,
    },
    {
      route: ndolaKitwe,
      operator: powerTools,
      driver: drivers[1],
      bus: 'BAD 3456 ZM',
      departure: setTime(day1, 9, 0),
      totalSeats: 36,
      availableSeats: 15,
      price: 80,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaChipata,
      operator: mazhandu,
      driver: drivers[3],
      bus: 'BAE 7890 ZM',
      departure: setTime(day1, 10, 0),
      totalSeats: 52,
      availableSeats: 30,
      price: 450,
      status: JourneyStatus.SCHEDULED,
    },
    // Day 2 journeys
    {
      route: lusakaNdola,
      operator: mazhandu,
      driver: drivers[2],
      bus: 'BAB 5678 ZM',
      departure: setTime(day2, 5, 30),
      totalSeats: 48,
      availableSeats: 48,
      price: 250,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaLivingstone,
      operator: powerTools,
      driver: drivers[0],
      bus: 'BAA 1234 ZM',
      departure: setTime(day2, 6, 0),
      totalSeats: 52,
      availableSeats: 52,
      price: 370,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: livingstoneLusaka,
      operator: juldan,
      driver: drivers[5],
      bus: 'BAF 2345 ZM',
      departure: setTime(day2, 7, 0),
      totalSeats: 44,
      availableSeats: 44,
      price: 350,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaKitwe,
      operator: mazhandu,
      driver: drivers[3],
      bus: 'BAE 7890 ZM',
      departure: setTime(day2, 8, 0),
      totalSeats: 52,
      availableSeats: 52,
      price: 280,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: ndolaLusaka,
      operator: powerTools,
      driver: drivers[1],
      bus: 'BAD 3456 ZM',
      departure: setTime(day2, 14, 0),
      totalSeats: 36,
      availableSeats: 36,
      price: 250,
      status: JourneyStatus.SCHEDULED,
    },
    // Day 3 journeys
    {
      route: lusakaNdola,
      operator: juldan,
      driver: drivers[4],
      bus: 'BAC 9012 ZM',
      departure: setTime(day3, 6, 0),
      totalSeats: 44,
      availableSeats: 44,
      price: 230,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaChipata,
      operator: powerTools,
      driver: drivers[0],
      bus: 'BAA 1234 ZM',
      departure: setTime(day3, 5, 0),
      totalSeats: 52,
      availableSeats: 52,
      price: 420,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaKabwe,
      operator: mazhandu,
      driver: drivers[2],
      bus: 'BAB 5678 ZM',
      departure: setTime(day3, 7, 30),
      totalSeats: 48,
      availableSeats: 48,
      price: 160,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaLivingstone,
      operator: juldan,
      driver: drivers[5],
      bus: 'BAF 2345 ZM',
      departure: setTime(day3, 8, 0),
      totalSeats: 44,
      availableSeats: 44,
      price: 340,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: ndolaKitwe,
      operator: mazhandu,
      driver: drivers[3],
      bus: 'BAE 7890 ZM',
      departure: setTime(day3, 10, 0),
      totalSeats: 52,
      availableSeats: 52,
      price: 85,
      status: JourneyStatus.SCHEDULED,
    },
    {
      route: lusakaKitwe,
      operator: powerTools,
      driver: drivers[1],
      bus: 'BAD 3456 ZM',
      departure: setTime(day3, 12, 0),
      totalSeats: 36,
      availableSeats: 36,
      price: 290,
      status: JourneyStatus.SCHEDULED,
    },
  ];

  const journeys = await Promise.all(
    journeySeeds.map((j) =>
      prisma.journey.create({
        data: {
          id: uuidv4(),
          routeId: j.route.id,
          operatorId: j.operator.id,
          driverId: j.driver.id,
          busRegistration: j.bus,
          departureTime: j.departure,
          totalSeats: j.totalSeats,
          availableSeats: j.availableSeats,
          price: j.price,
          status: j.status,
          trackingToken: generateTrackingToken(),
        },
      })
    )
  );

  console.log(`Created ${journeys.length} journeys.`);

  // ─── Bookings ────────────────────────────────────────────────────────────

  const bookingData = [
    {
      journey: journeys[0],
      user: passengers[0],
      seat: 12,
      method: PaymentMethod.AIRTEL_MONEY,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CHECKED_IN,
      via: 'WEB',
    },
    {
      journey: journeys[0],
      user: passengers[1],
      seat: 13,
      method: PaymentMethod.MTN_MOMO,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CHECKED_IN,
      via: 'USSD',
    },
    {
      journey: journeys[0],
      user: passengers[2],
      seat: 22,
      method: PaymentMethod.PAY_AT_TERMINAL,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CONFIRMED,
      via: 'WEB',
    },
    {
      journey: journeys[1],
      user: passengers[3],
      seat: 5,
      method: PaymentMethod.ZAMTEL_KWACHA,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CHECKED_IN,
      via: 'WEB',
    },
    {
      journey: journeys[1],
      user: passengers[4],
      seat: 6,
      method: PaymentMethod.AIRTEL_MONEY,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CHECKED_IN,
      via: 'WEB',
    },
    {
      journey: journeys[2],
      user: passengers[0],
      seat: 3,
      method: PaymentMethod.MTN_MOMO,
      payStatus: PaymentStatus.PROCESSING,
      bookStatus: BookingStatus.PENDING,
      via: 'USSD',
    },
    {
      journey: journeys[4],
      user: passengers[1],
      seat: null,
      method: PaymentMethod.AIRTEL_MONEY,
      payStatus: PaymentStatus.PENDING,
      bookStatus: BookingStatus.PENDING,
      via: 'WEB',
    },
    {
      journey: journeys[4],
      user: passengers[2],
      seat: 10,
      method: PaymentMethod.PAY_AT_TERMINAL,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CONFIRMED,
      via: 'WEB',
    },
    {
      journey: journeys[5],
      user: passengers[3],
      seat: null,
      method: PaymentMethod.MTN_MOMO,
      payStatus: PaymentStatus.PENDING,
      bookStatus: BookingStatus.PENDING,
      via: 'WEB',
    },
    {
      journey: journeys[6],
      user: passengers[4],
      seat: 1,
      method: PaymentMethod.AIRTEL_MONEY,
      payStatus: PaymentStatus.PAID,
      bookStatus: BookingStatus.CONFIRMED,
      via: 'WEB',
    },
  ];

  const bookings = await Promise.all(
    bookingData.map((b) =>
      prisma.booking.create({
        data: {
          id: uuidv4(),
          journeyId: b.journey.id,
          userId: b.user.id,
          seatNumber: b.seat,
          reference: generateRef(),
          paymentMethod: b.method,
          paymentStatus: b.payStatus,
          status: b.bookStatus,
          price: b.journey.price,
          bookedVia: b.via,
          passengerPhone: b.user.phone,
          passengerName: b.user.name,
        },
      })
    )
  );

  console.log(`Created ${bookings.length} bookings.`);

  // ─── Ratings ─────────────────────────────────────────────────────────────

  const ratingData = [
    {
      booking: bookings[0],
      driver: drivers[0],
      user: passengers[0],
      stars: 5,
      comment: 'Very safe driver, arrived on time. Great experience on the Lusaka-Ndola route.',
    },
    {
      booking: bookings[1],
      driver: drivers[0],
      user: passengers[1],
      stars: 4,
      comment: 'Good trip overall. Bus was clean and comfortable.',
    },
    {
      booking: bookings[3],
      driver: drivers[2],
      user: passengers[3],
      stars: 5,
      comment: 'Excellent service by Mazhandu. Joseph is a very careful driver.',
    },
    {
      booking: bookings[4],
      driver: drivers[2],
      user: passengers[4],
      stars: 4,
      comment: 'Smooth ride to Livingstone. Would recommend.',
    },
  ];

  const ratings = await Promise.all(
    ratingData.map((r) =>
      prisma.rating.create({
        data: {
          id: uuidv4(),
          bookingId: r.booking.id,
          driverId: r.driver.id,
          userId: r.user.id,
          stars: r.stars,
          comment: r.comment,
        },
      })
    )
  );

  console.log(`Created ${ratings.length} ratings.`);

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log('\nSeed completed successfully!');
  console.log('────────────────────────────');
  console.log(`  Operators:  ${operators.length}`);
  console.log(`  Drivers:    ${drivers.length}`);
  console.log(`  Routes:     ${routes.length}`);
  console.log(`  Journeys:   ${journeys.length}`);
  console.log(`  Passengers: ${passengers.length}`);
  console.log(`  Bookings:   ${bookings.length}`);
  console.log(`  Ratings:    ${ratings.length}`);
  console.log('────────────────────────────');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
