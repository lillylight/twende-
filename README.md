# Twende - Real-Time Bus Safety & Booking Platform for Zambia

Twende is a comprehensive transportation safety and booking platform built for Zambia's intercity bus network. It provides real-time GPS tracking, verified operators, USSD booking via \*147#, mobile money payments (Airtel Money, MTN MoMo, Zamtel Kwacha), and RTSA compliance monitoring.

## Architecture

- **Frontend**: Next.js 15 (App Router) with Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 15 with Prisma ORM
- **Cache/Real-time**: Redis 7 with ioredis
- **Maps**: Google Maps 3D Tiles + CesiumJS
- **Payments**: Airtel Money, MTN MoMo, Zamtel Kwacha
- **SMS/USSD**: Africa's Talking
- **Queues**: BullMQ (SMS, alerts, payments)
- **State**: Zustand

## Project Structure

```
twende/
├── apps/web/                   # Next.js web application
│   ├── prisma/                 # Database schema & seed
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   │   ├── (auth)/         # Login, Register
│   │   │   ├── passenger/      # Passenger dashboard, search, booking, tracking
│   │   │   ├── driver/         # Driver dashboard, active journey, history
│   │   │   ├── rtsa/           # RTSA regulator dashboard
│   │   │   ├── track/[token]/  # Public tracking link
│   │   │   └── api/            # 32 API routes
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/                # Core infrastructure
│   │   │   ├── payments/       # Mobile money integrations
│   │   │   ├── queues/         # BullMQ job queues
│   │   │   ├── safety/         # Safety thresholds & compliance
│   │   │   └── ussd/           # USSD menu handlers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand state stores
│   │   └── types/              # TypeScript types
│   └── package.json
├── packages/
│   ├── db/                     # Database migrations
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities
├── docker-compose.yml          # PostgreSQL + Redis
└── package.json                # Monorepo root
```

## Quick Start

```bash
# Install dependencies
npm install

# Start PostgreSQL + Redis
docker-compose up -d

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed development data
npm run db:seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Key Features

### Passenger

- Search and book intercity bus journeys
- Interactive seat selection
- Pay via Airtel Money, MTN MoMo, Zamtel Kwacha, or cash
- Real-time GPS bus tracking with 3D map
- Share live tracking link with contacts
- SOS emergency button
- Rate drivers after trips
- USSD access via \*147# (works on any phone)

### Driver

- GPS tracking with 5-second position updates
- Offline GPS buffering (auto-syncs when connection returns)
- Passenger manifest
- Speed monitoring with warnings
- Journey start/end controls
- GPS simulation for web testing

### RTSA Regulator Dashboard

- Live 3D fleet map (CesiumJS + Google 3D Tiles)
- Operator compliance scoring
- Safety alerts (speeding, route deviation, signal loss)
- Operator suspend/warning actions
- Route risk analysis
- Journey audit trail

### Safety

- Speed threshold alerts (>100 km/h warning, >120 km/h critical)
- Route deviation detection (>2km warning, >5km critical)
- Signal loss monitoring
- Automated SMS alerts to passengers and RTSA
- Compliance score engine
- SOS system with emergency contact notifications

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

See `.env.example` for all required variables.

## Tech Stack

| Layer     | Technology                            |
| --------- | ------------------------------------- |
| Framework | Next.js 15 (App Router)               |
| Styling   | Tailwind CSS 4                        |
| Database  | PostgreSQL 15 + Prisma                |
| Cache     | Redis 7 + ioredis                     |
| State     | Zustand                               |
| Maps      | CesiumJS + Google Maps 3D Tiles       |
| Payments  | Airtel Money, MTN MoMo, Zamtel Kwacha |
| SMS/USSD  | Africa's Talking                      |
| Queues    | BullMQ                                |
| Auth      | JWT + bcryptjs                        |
| Icons     | Lucide React                          |

## License

Private - All rights reserved.
