# Lumeo CRM

A premium Next.js 15 + Tailwind starter for the Lumeo CRM frontend — bone/ink editorial aesthetic, every CRM surface wired up.

```
SaaS  →  Workspaces · Team · Roles · Trial · Billing (Stripe + Razorpay)
CRM   →  Leads · Customers · Deals (Kanban) · Tasks · Notes · Dashboard
Auth  →  JWT (httpOnly cookie via backend) + middleware guard
```

---

## Quick start

```bash
# 1. Install
npm install            # or pnpm install / yarn

# 2. Configure
cp .env.example .env.local
# edit NEXT_PUBLIC_API_URL to point at your backend

# 3. Run
npm run dev            # http://localhost:3000
```

The dev middleware bypasses auth so you can browse the dashboard immediately. Remove the bypass in `src/middleware.ts` before shipping.

---

## What's inside

```
src/
├── app/
│   ├── layout.tsx              # Fonts (Instrument Serif + Geist), tokens
│   ├── globals.css             # Tailwind layers, design tokens, paper grain
│   ├── page.tsx                # → redirects to /dashboard
│   ├── (auth)/
│   │   └── login/              # Editorial split-screen login
│   └── (app)/
│       ├── layout.tsx          # Sidebar + topbar shell
│       ├── dashboard/          # Full dashboard (KPIs, pipeline, chart, etc.)
│       ├── leads/
│       ├── customers/
│       ├── deals/
│       ├── tasks/
│       ├── notes/
│       └── billing/
├── components/
│   ├── sidebar.tsx             # Workspace switcher · nav · trial card
│   ├── topbar.tsx              # Breadcrumb · ⌘K search · user chip
│   ├── kpi-strip.tsx           # 4 KPIs with sparklines
│   ├── pipeline-board.tsx      # 5-stage kanban
│   ├── revenue-chart.tsx       # Actual / forecast / target SVG chart
│   ├── activity-feed.tsx
│   ├── tasks-list.tsx          # Stateful toggleable tasks
│   ├── notes-list.tsx
│   └── page-placeholder.tsx    # Shared empty state
├── lib/
│   ├── api.ts                  # Axios client with JWT interceptor
│   └── utils.ts                # cn() + formatINR()
└── middleware.ts               # Auth guard for /(app) routes
```

---

## Design tokens

All colors and typography map to Tailwind classes — no inline styles, no surprises.

| Token | Hex | Use |
|---|---|---|
| `bg-bone` | `#F4EFE6` | Page background |
| `bg-paper` | `#FAF6EE` | Card / surface |
| `bg-bone-2` | `#ECE6D8` | Hover / chip background |
| `text-ink` | `#1A1714` | Primary text |
| `text-muted` | `#7A6F5F` | Secondary text, axis labels |
| `text-accent` / `bg-accent` | `#FF5B1F` | Accents, CTAs, eyebrow rules |
| `border-line` | `#DDD4C0` | Borders |
| `font-serif` | Instrument Serif | Display, KPI numbers, page titles |
| `font-sans` | Geist | UI, body |
| `font-mono` | Geist Mono | Numbers, timestamps, code |

Edit `tailwind.config.ts` and `src/app/globals.css` to retheme.

---

## Wiring up your backend

The mockup pages use static data. Replace with real fetches:

```ts
// example: src/app/(app)/leads/page.tsx
import { api, endpoints } from "@/lib/api";

export default async function LeadsPage() {
  const { data } = await api.get(endpoints.leads);
  // ...render data
}
```

Endpoints stubbed in `src/lib/api.ts`:

| Group | Endpoint |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Workspaces | `GET/POST /workspaces`, members, roles |
| CRM | `/leads`, `/customers`, `/deals`, `/tasks`, `/notes` |
| Billing | `/billing/plans`, `/billing/subscription`, `/billing/checkout` |

### Recommended backend stack (matches your spec)

- **Node + Express** or **NestJS** (or FastAPI / Django if you prefer Python)
- **PostgreSQL** with Prisma or Drizzle
- **Redis** for sessions, rate limits, and BullMQ job queues
- **JWT** auth — sign on backend, set as `httpOnly; Secure; SameSite=Lax` cookie called `lumeo_token`
- **Stripe** for global, **Razorpay** for India — webhook handlers update subscription state
- **Docker Compose** for local dev (postgres + redis + api + this frontend)

---

## Next things to build (recommended order)

1. **Command palette** (`⌘K`) — install `cmdk`, mount in topbar
2. **Lead/deal detail drawer** — Radix Dialog with `side="right"`
3. **Drag-and-drop kanban** — swap pipeline cards for `dnd-kit`
4. **React Query setup** — wrap `(app)/layout.tsx` with `QueryClientProvider`
5. **Workspace switcher dropdown** — Radix Popover, list workspaces from `/workspaces`
6. **Real auth flow** — hook the login form to your `/auth/login` endpoint
7. **Billing checkout** — Stripe Elements or Razorpay Checkout.js inside `/billing`

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router, RSC) |
| UI | React 19 + Tailwind CSS 3 |
| Fonts | Instrument Serif, Geist, Geist Mono via `next/font` |
| Icons | Lucide React |
| Data | TanStack Query (installed, not yet wired) |
| HTTP | Axios with JWT interceptor |
| Validation | Zod (installed) |
| TypeScript | Strict mode on |

---

## Scripts

```bash
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run start        # Run production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

---

Built with care for teams who close the whole quarter.
