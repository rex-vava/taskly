# Taskly

A full-stack task management and productivity platform for individuals and teams. Organize work with boards, lists, and tasks — collaborate in real time, track progress, and stay on top of deadlines.

## Features

- **Task management** — Create, edit, assign, prioritize, and track tasks
- **Drag-and-drop Kanban** — Move tasks between columns with @dnd-kit
- **Boards & lists** — Kanban-style project workflows
- **Team collaboration** — Invite members by email, manage roles, remove members
- **Calendar** — Month view with task deadlines and custom events
- **Deadline reminders** — Automatic notifications 1 day before and on due date
- **Dashboard** — Task stats, charts, upcoming deadlines, team activity
- **Real-time updates** — Socket.io for live board and notification sync
- **JWT authentication** — Secure login and protected routes

## Tech Stack

| Layer    | Technologies                          |
| -------- | ------------------------------------- |
| Frontend | React, Tailwind CSS, Redux Toolkit, @dnd-kit |
| Backend  | Node.js, Express.js                   |
| Database | PostgreSQL                            |
| DevOps   | Docker Compose                        |

## Quick Start (Docker — recommended)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
cd taskly
npm run docker:up
```

- Frontend: http://localhost:5173
- API: http://localhost:5000

Demo data is seeded automatically on first run.

### Demo Accounts

| Email | Password | Role |
| ----- | -------- | ---- |
| alex@taskly.demo | password123 | Project Manager |
| sara@taskly.demo | password123 | Designer |
| ali@taskly.demo | password123 | Developer |
| jordan@taskly.demo | password123 | QA |

Reset everything (wipe DB and re-seed):

```bash
npm run docker:reset
```

## Manual Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Database

```bash
createdb taskly
psql -d taskly -f server/db/schema.sql
```

### Environment

```bash
copy server\.env.example server\.env
```

Edit `server/.env` with your `DATABASE_URL` and `JWT_SECRET`.

### Install & Run

```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
npm run seed    # load demo data
npm run dev
```

## Project Structure

```
taskly/
├── client/              # React frontend (Vite)
├── server/
│   ├── db/
│   │   ├── schema.sql   # PostgreSQL schema
│   │   └── seed.js      # Demo data script
│   └── src/
│       ├── routes/      # API routes
│       ├── services/    # Reminders, activity
│       └── socket/      # Socket.io
├── docker-compose.yml
└── README.md
```

## API Overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/boards` | List boards |
| PATCH | `/api/tasks/reorder` | Drag-and-drop task move |
| POST | `/api/team/boards/:id/invite` | Invite member by email |
| GET | `/api/calendar?month=2025-06` | Calendar events + deadlines |
| POST | `/api/calendar/events` | Create calendar event |

## License

MIT
