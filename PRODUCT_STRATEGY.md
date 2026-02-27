# Task Dashboard — Product Strategy & Release Plan

This is a **strategic advisory document** covering naming, release strategy, paid-tier feature requirements, and security considerations.

---

## 1. App Name Recommendations

The name should convey: productivity (not just todos), the Eisenhower matrix philosophy, keyboard-first power users, and simplicity.

| Name | Rationale | Domain Availability Notes |
|------|-----------|--------------------------|
| **Quadra** | Directly references the 4-quadrant Eisenhower matrix. Short, punchy, memorable. Works as "Quadra" or "Quadra Tasks". | .app / .dev likely available |
| **EisenTask** | Makes the Eisenhower connection explicit. Signals "this is different from a todo app." | Unique enough for .com |
| **FourQ** | Playful abbreviation of "Four Quadrants." Short, brandable, keyboard-friendly feel. | Very short, good for CLI branding |
| **Praxis** | Greek for "action/practice." Conveys getting things done, not just listing things. Premium feel. | Common word, harder to get .com |
| **Quadrant** | Clean, direct, professional. "Quadrant — Prioritize what matters." | May need .app or .io |

**Recommendation: `Quadra`** — it's short (great for keyboard-centric branding), unique, directly tied to the Eisenhower 4-quadrant philosophy, and works well across contexts: CLI (`quadra`), URL (`quadra.app`), conversations ("I use Quadra").

---

## 2. Release Strategy: Community Edition (CE) vs Paid (Pro/Cloud)

### 2.1 Architecture Split

```
quadra/
├── packages/
│   ├── core/           # Shared business logic, types, utilities
│   ├── client/         # React frontend (shared between CE and Pro)
│   ├── server/         # Express API server (shared base)
│   ├── db-sqlite/      # SQLite adapter (CE)
│   └── db-supabase/    # Supabase/Postgres adapter (Pro/Cloud)
├── apps/
│   ├── community/      # CE build config — bundles core + client + server + db-sqlite
│   └── cloud/          # Pro build config — bundles core + client + server + db-supabase
```

**Key principle**: Single codebase with a **database adapter pattern**. The frontend and API layer stay identical; only the storage backend differs.

### 2.2 Community Edition (CE) — Free, Forever

**Distribution**: GitHub releases (zip/tar), Docker Hub image, Homebrew/Scoop, optional Electron desktop app.

**What's included** (everything you have today):
- All 4 views (Projects, All Tasks, Priority Matrix, Kanban)
- Full Eisenhower matrix with drag-and-drop
- Keyboard shortcuts (20+)
- Pomodoro timer
- Subtasks, notes, templates
- Quick Inbox, Quick Add
- Review Mode (daily/weekly)
- GTD context tags
- Focus Mode
- Dark/light theme
- SQLite database (local, single-user)
- YAML export
- Activity log

**What CE does NOT get**:
- No auth/multi-user (single-user local app)
- No cloud sync
- No team features
- No integrations

### 2.3 Paid Tiers (Cloud/Pro)

| Feature | Free Trial | Starter ($8/mo) | Pro ($15/mo) | Team ($12/user/mo) |
|---------|-----------|-----------------|-------------|-------------------|
| Duration | 14 days full access | — | — | — |
| Projects | Unlimited (trial) | 10 | Unlimited | Unlimited |
| Tasks | Unlimited (trial) | 200 | Unlimited | Unlimited |
| Cloud sync | ✅ | ✅ | ✅ | ✅ |
| All CE features | ✅ | ✅ | ✅ | ✅ |
| Recurring tasks | ✅ | ✅ | ✅ | ✅ |
| Calendar view | ✅ | ❌ | ✅ | ✅ |
| Dashboard analytics | ✅ | Basic | Advanced | Advanced |
| API access | ✅ | ❌ | ✅ | ✅ |
| Team workspaces | ✅ | ❌ | ❌ | ✅ |
| Shared projects | ✅ | ❌ | ❌ | ✅ |
| Task assignments | ✅ | ❌ | ❌ | ✅ |
| Custom integrations | ✅ | ❌ | ✅ | ✅ |
| Priority support | ❌ | ❌ | ✅ | ✅ |
| Data export (JSON/CSV) | ✅ | ✅ | ✅ | ✅ |
| Audit trail | ❌ | ❌ | ✅ | ✅ |

### 2.4 Release Sequence

**Phase A — Community Edition Launch (Month 1-2)**
1. Rebrand from "Task Dashboard" → Quadra
2. Clean up repo, add LICENSE (MIT for CE)
3. Create landing page: `quadra.app` — positioning as "Eisenhower-powered productivity for keyboard-first people"
4. Publish to GitHub with proper README, screenshots, demo GIF
5. Docker image on Docker Hub
6. Homebrew tap / Scoop bucket for easy install
7. Post on Hacker News, Reddit (r/productivity, r/selfhosted), Product Hunt

**Phase B — Cloud Infrastructure (Month 2-4)**
1. Set up Supabase project (Postgres + Auth + Row Level Security)
2. Implement database adapter pattern (swap SQLite ↔ Supabase)
3. Add authentication (Supabase Auth — email/password, Google, GitHub OAuth)
4. Implement multi-tenancy with Row Level Security
5. Build subscription management (Stripe integration)
6. Deploy cloud version (Vercel/Railway for server, Supabase for DB)

**Phase C — Paid Launch (Month 4-5)**
1. Add paid-only features (see Section 3)
2. Implement free trial (14 days, no credit card required)
3. Set up Stripe billing with tier management
4. Launch cloud version with waitlist/beta access
5. Gradual rollout → public launch

---

## 3. MUST-HAVE Features for Paid Version Before Public Release

### 3.1 Authentication & User Management
- Email/password signup + login
- OAuth (Google, GitHub at minimum)
- Password reset flow
- Email verification
- Session management (view/revoke active sessions)
- Account deletion (GDPR compliance)

### 3.2 Recurring / Repeating Tasks
- Repeat patterns: daily, weekdays, weekly, biweekly, monthly, custom
- Auto-create next instance when current one completes
- "Skip this occurrence" option
- This is a **major differentiator** — the CE version doesn't have it

### 3.3 Calendar View (5th view)
- Monthly/weekly calendar showing tasks by due date
- Drag tasks to reschedule
- Integrates with the existing 4-view system (Alt+5)
- Visual overdue/today highlighting

### 3.4 Dashboard Analytics
- Completion rate over time (line chart)
- Time in each quadrant (pie chart)
- Productivity trends (tasks completed per week)
- Pomodoro statistics over time
- "Stuck tasks" report (tasks in progress > 7 days)
- Exportable as PDF

### 3.5 Cloud Sync & Cross-Device
- Real-time sync across browser tabs/devices
- Offline-first: works without internet, syncs when back online
- Conflict resolution strategy (last-write-wins with merge for non-conflicting fields)

### 3.6 Integrations (Pro tier)
- Webhook support (task created/completed/overdue events)
- REST API with API keys for automation
- Import from: Todoist, Trello, Asana (CSV at minimum)

### 3.7 Onboarding
- First-run tutorial overlay (highlight key features)
- Sample project with example tasks demonstrating Eisenhower usage
- Keyboard shortcut trainer ("Press Alt+I to open Quick Inbox")

### 3.8 Data Portability
- Export all data as JSON/CSV
- Import from JSON backup
- This should work in BOTH CE and Paid (builds trust)

---

## 4. MUST-HAVE Security Considerations for Paid Version

### 4.1 Authentication Security
- **Password hashing**: bcrypt with cost factor >= 12
- **Rate limiting on auth endpoints**: 5 attempts per 15 min per IP
- **Account lockout**: Temporary lockout after 10 failed attempts
- **JWT/Session security**: httpOnly cookies, secure flag, SameSite=Strict
- **Token refresh**: Short-lived access tokens (15 min), longer refresh tokens (7 days)
- **OAuth state parameter**: CSRF protection for OAuth flows

### 4.2 Multi-Tenancy & Data Isolation
- **Row Level Security (RLS)** in Supabase/Postgres — every table has `user_id` column, RLS policies ensure users ONLY see their own data
- **API-level checks**: Even with RLS, validate `user_id` ownership in every API handler (defense in depth)
- **No data leakage in errors**: Never return another user's data in error messages
- **Shared project access**: Explicit invite model with permission levels (viewer, editor, admin)

### 4.3 API Security
- **Input validation**: Joi/Zod schemas on every endpoint
- **Rate limiting**: Tiered limits (100 req/min free, 300 req/min Pro)
- **Request size limits**: `express.json({ limit: '1mb' })`
- **SQL injection prevention**: Always use parameterized queries (current better-sqlite3 usage is safe, maintain this with Supabase)
- **CORS**: Strict origin whitelist (only your frontend domain)

### 4.4 Infrastructure Security
- **HTTPS everywhere**: Force HTTPS, HSTS headers
- **Security headers**: Helmet.js (CSP, X-Frame-Options, X-Content-Type-Options)
- **Secrets management**: Environment variables, never in code. Use a vault (e.g., Doppler, Infisical) for production
- **Database encryption**: Supabase encrypts at rest by default, ensure SSL connections
- **Backups**: Supabase has Point-in-Time Recovery, but also implement daily logical backups

### 4.5 Payment Security
- **Never handle card data**: Use Stripe Checkout / Stripe Elements (PCI compliance via Stripe)
- **Webhook signature verification**: Always verify Stripe webhook signatures
- **Subscription state server-side**: Never trust the client for subscription status
- **Graceful downgrade**: When subscription lapses, don't delete data — make it read-only and prompt to renew

### 4.6 Privacy & Compliance
- **GDPR compliance**:
  - Right to access: "Download my data" feature
  - Right to erasure: "Delete my account" with full data wipe
  - Privacy policy and terms of service
  - Cookie consent (if using cookies beyond strict necessity)
- **Data retention policy**: Define and enforce how long deleted data is retained
- **Audit log**: Track who accessed what (required for Team tier)

### 4.7 Client-Side Security
- **XSS prevention**: Sanitize all rendered markdown (DOMPurify)
- **CSP headers**: Strict Content-Security-Policy
- **Subresource Integrity**: SRI hashes for external resources (Google Fonts)
- **No secrets in client bundle**: API keys, Supabase keys — use public anon key only, rely on RLS

### 4.8 Operational Security
- **Dependency scanning**: Dependabot or Snyk for automated vulnerability alerts
- **Error tracking**: Sentry (scrub PII from error reports)
- **Monitoring**: Uptime monitoring, anomaly detection on API usage patterns
- **Incident response plan**: Document what to do if there's a data breach
- **Penetration testing**: Before public launch, run OWASP ZAP or hire a pentest firm

---

## 5. Hosting Architecture

### 5.1 Recommended Stack

| Layer | Service | Rationale |
|-------|---------|-----------|
| **Frontend** | AWS Amplify | Already in use, good CI/CD, preview deploys, auto SSL |
| **Backend API** | AWS ECS Fargate or EC2 | Same AWS account as Amplify, low latency in same region |
| **Database** | Supabase (Postgres) | Auth + RLS + real-time built-in, saves months of dev time |
| **Payments** | Stripe | Industry standard, PCI compliance handled |
| **File Storage** | Supabase Storage (or S3) | Attachments, avatars if needed later |

### 5.2 Why Supabase Over AWS RDS

Supabase is the faster path to launch despite adding a second cloud provider:

- **Auth included**: Email/password, Google, GitHub OAuth — ready to use, no Cognito setup
- **Row Level Security**: First-class support, multi-tenancy without custom middleware
- **Real-time subscriptions**: Built-in websocket sync for cross-device, no AppSync needed
- **Dashboard**: DB explorer, logs, auth management — no pgAdmin setup
- **Cost**: $25/mo starter (500MB DB, 1GB storage) vs comparable RDS + Cognito spend

Going full AWS (RDS + Cognito + custom RLS middleware + AppSync for real-time) would add 2-3 months of infrastructure work before shipping any paid features.

### 5.3 Escape Hatch to AWS RDS

The database adapter pattern (Section 2.1) ensures migration is straightforward if needed:

1. `pg_dump` from Supabase Postgres
2. `pg_restore` into AWS RDS
3. Swap connection string in `db-supabase` adapter (or create `db-rds` adapter)
4. Replace Supabase Auth with AWS Cognito
5. Replace Supabase real-time with custom websockets or AppSync

**When to migrate**: If enterprise/compliance requirements demand single-cloud (B2B buyers asking "where is data hosted?"), or if Supabase costs exceed equivalent RDS at scale (~500+ users).

### 5.4 AWS Amplify Frontend Configuration

```
Amplify App
├── Production branch (main)    → quadra.app
├── Staging branch (develop)    → staging.quadra.app
└── PR preview deploys          → pr-123.quadra.app
```

**Environment variables in Amplify**:
- `REACT_APP_API_URL` — points to ECS Fargate backend
- `REACT_APP_SUPABASE_URL` — Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` — public anon key (safe for client, RLS protects data)
- `REACT_APP_STRIPE_PUBLISHABLE_KEY` — Stripe public key

### 5.5 Cost Estimate (Early Stage, <100 users)

| Service | Monthly Cost |
|---------|-------------|
| AWS Amplify (frontend) | ~$0-5 (free tier covers most) |
| AWS ECS Fargate (API) | ~$10-15 (0.25 vCPU, 0.5GB) |
| Supabase (DB + Auth) | $25 (Pro plan) |
| Stripe | 2.9% + $0.30 per transaction |
| Domain (quadra.app) | ~$15/year |
| **Total** | **~$40-50/mo** |

---

## Summary

| Decision | Recommendation |
|----------|---------------|
| **App Name** | Quadra |
| **CE Distribution** | GitHub + Docker + Homebrew/Scoop |
| **CE License** | MIT |
| **Frontend Hosting** | AWS Amplify (existing account) |
| **Backend Hosting** | AWS ECS Fargate (same region as Amplify) |
| **Database** | Supabase (Postgres + Auth + RLS), with escape hatch to AWS RDS |
| **Payment Processor** | Stripe |
| **Paid Tiers** | Starter ($8), Pro ($15), Team ($12/user) |
| **Key Paid Differentiators** | Recurring tasks, Calendar view, Analytics, Cloud sync, Team features |
| **Security Framework** | Supabase RLS + Helmet + Rate limiting + Stripe for payments |
| **Estimated Infra Cost** | ~$40-50/mo at early stage (<100 users) |
| **Launch Order** | CE first → build community → Cloud beta → paid launch |
