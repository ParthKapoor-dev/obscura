## 📌 Project Overview

This project is a **personal expense tracking and bill-splitting web application**.
It allows a user to:

* Track individual expenses.
* Split bills with friends.
* Create **Trips/Events** where expenses can be shared among multiple people, with flexibility (e.g., some items only for certain friends).
* Request/settle payments with friends.

The goal is to build a **fast, reliable, and robust app** with a **modern UI** while keeping the system simple (since it’s mostly for personal use) but extensible for the future.

---

## 🎯 Product Requirements

1. **Core Features**

   * Google OAuth login (via `better-auth`).
   * Add/edit/delete personal expenses.
   * Create Trips/Events with multiple participants.
   * Split bills:

     * Evenly across all participants.
     * Or selectively across specific participants.
   * Track who owes what to whom.
   * Dashboard for expense summaries, balances, and settlements.
   * Ability to request payment from a friend (manually tracked, not payment gateway).

2. **Future Features**

   * Email/push reminders for pending settlements.
   * Automated reports (monthly, event-based).
   * Notifications when added to an event.
   * Export as PDF/CSV.
   * (Optional) AI-powered expense insights.

---

## 🏗️ Technical Architecture

* **Frontend:**

  * Next.js (App Router)
  * TypeScript
  * TailwindCSS

* **Authentication:**

  * Google OAuth via `better-auth`

* **Database:**

  * PostgreSQL (preferably **Neon DB** or **Vercel Postgres**)
  * ORM: **Drizzle ORM**

* **Backend Communication:**

  * **tRPC** for end-to-end type-safe APIs inside Next.js

* **Future Background Jobs (optional):**

  * **BullMQ (Redis)** for:

    * Sending settlement reminders.
    * Generating reports in background.
    * Scheduling notifications.

* **Deployment:**

  * Frontend/backend: **Vercel**
  * DB: **Neon (or Vercel Postgres)**
  * Redis (if needed later): **Upstash free tier**

---

## 📂 Suggested Database Schema

### Users

```sql
users (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  avatar_url TEXT
)
```

### Friends

```sql
friends (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  friend_user_id UUID REFERENCES users(id)
)
```

### Events (Trips/Groups)

```sql
events (
  id UUID PRIMARY KEY,
  name TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP
)
```

### Event Participants

```sql
event_participants (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id)
)
```

### Expenses

```sql
expenses (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id) NULL, -- null if personal expense
  description TEXT,
  amount DECIMAL,
  paid_by UUID REFERENCES users(id),
  created_at TIMESTAMP
)
```

### Expense Splits

```sql
expense_splits (
  id UUID PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id),
  user_id UUID REFERENCES users(id),
  share DECIMAL
)
```

### Settlements

```sql
settlements (
  id UUID PRIMARY KEY,
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  amount DECIMAL,
  status TEXT CHECK (status IN ('pending','completed'))
)
```

---

## 🚀 Development Roadmap

### Phase 1: Foundations

1. **Setup Next.js + TypeScript + TailwindCSS**.
2. **Add Auth (Google OAuth with better-auth)**.
3. **Configure Database (Neon + Drizzle ORM)**.
4. **Implement basic User model & onboarding flow**.

### Phase 2: Core Expense Tracking

1. Implement basic **expense model** (personal expenses).
2. Build UI for adding/viewing/deleting expenses.
3. Add ability to track balances (summary view).

### Phase 3: Friends & Events

1. Implement **friends table + relationships**.
2. Add ability to create **events/trips**.
3. Implement **splitting logic** (expense_splits).
4. Show balances per event.

### Phase 4: Settlements

1. Add **settlement table** (manual marking as paid).
2. Build UI for requesting/settling money.
3. Add **dashboard** showing total balance across all friends.

### Phase 5: Future Enhancements

* Add **BullMQ + Redis** for background jobs:

  * Payment reminders.
  * Monthly reports.
  * Notifications.
* Add **exports** (CSV/PDF).
* Add **analytics dashboard** for insights.

---

## ⚡ Guidelines for AI Agent Development

* Always prioritize **core functionality > future enhancements**.
* Stick to **tRPC + Drizzle + Neon** stack for simplicity.
* Use **end-to-end TypeScript types** (no `any`).
* Optimize schema for **flexibility in splitting logic**.
* Follow the roadmap strictly — don’t overcomplicate early phases.
* Keep UI minimal but **responsive and elegant** with Tailwind.
* Only introduce **BullMQ/Redis** when async jobs become necessary.

---

## ✅ Success Criteria

* App should be deployable to **Vercel** with minimal setup.
* Users can **add expenses, split them, and track balances** reliably.
* Schema should support **expansion** (reports, reminders, notifications) without refactor.
* Codebase should be **clean, type-safe, and modular**.
