# Obscura - Expense Tracker

A personal expense tracking and bill-splitting web application built with Next.js, TypeScript, and modern web technologies.

## Features

- 🔐 Google OAuth authentication
- 💰 Track personal expenses
- 👥 Split bills with friends
- 🎉 Create trips/events for group expenses
- 📊 Dashboard for expense summaries and balances
- 💸 Request/settle payments with friends

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **Authentication**: better-auth with Google OAuth
- **Database**: PostgreSQL with Drizzle ORM
- **API**: tRPC for type-safe APIs
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon or Vercel Postgres recommended)
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd obscura
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/obscura"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

5. Set up the database:
```bash
# Generate migrations
npm run db:generate

# Push schema to database
npm run db:push
```

6. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Database Commands

- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run pending migrations
- `npm run db:studio` - Open Drizzle Studio

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── trpc/          # tRPC endpoints
│   ├── auth/              # Authentication pages
│   └── providers.tsx      # App providers
├── lib/
│   ├── auth/              # Authentication configuration
│   ├── db/                # Database schema and connection
│   └── trpc/              # tRPC configuration and routers
└── public/                # Static assets
```

## Development Roadmap

### Phase 1: Foundations ✅
- [x] Setup Next.js + TypeScript + TailwindCSS
- [x] Add Google OAuth with better-auth
- [x] Configure Database (Neon + Drizzle ORM)
- [x] Implement basic User model & onboarding flow
- [x] Add tRPC for type-safe APIs

### Phase 2: Core Expense Tracking
- [ ] Implement basic expense model (personal expenses)
- [ ] Build UI for adding/viewing/deleting expenses
- [ ] Add ability to track balances (summary view)

### Phase 3: Friends & Events
- [ ] Implement friends table + relationships
- [ ] Add ability to create events/trips
- [ ] Implement splitting logic (expense_splits)
- [ ] Show balances per event

### Phase 4: Settlements
- [ ] Add settlement table (manual marking as paid)
- [ ] Build UI for requesting/settling money
- [ ] Add dashboard showing total balance across all friends

### Phase 5: Future Enhancements
- [ ] Add BullMQ + Redis for background jobs
- [ ] Add exports (CSV/PDF)
- [ ] Add analytics dashboard for insights

## Contributing

This is a personal project, but contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License
