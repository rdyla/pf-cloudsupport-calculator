# PacketFusion CloudSupport Calculator

A support pricing tool for UCaaS, CCaaS, and MSO opportunities. Sales engineers use it to build versioned support proposals, preview and print agreement documents, and save them directly to SharePoint — all linked to Dynamics CRM accounts.

---

## Overview

### What it does

- **Calculator** — computes annual support fees and TCV across UCaaS, CCaaS, implementation SOW, and optional CloudSupport⁺ MSO add-on tiers. Managers and admins can apply price overrides.
- **Agreement Preview** — generates a formatted Proposal or Signature Page document from the saved version, previewable in-browser and printable/saveable as PDF.
- **SharePoint Upload** — saves the agreement HTML directly to the SharePoint document library linked to the CRM account or opportunity.
- **Version History** — every saved calculation is a version; the history tab shows all versions with a link to any SharePoint uploads.
- **Team View** — shows all opportunities across the company grouped by rep, with pipeline totals.
- **Dashboard** — landing page with a personalized greeting, pipeline stat cards, recent opportunities, and quick actions.
- **CRM Link** — search Dynamics 365 accounts and opportunities and link them to a local opportunity record.

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite, inline styles |
| Auth | Azure AD SSO via MSAL.js; JWT verified in the Worker |
| Backend API | Cloudflare Worker (Hono router) |
| Database | Cloudflare D1 (SQLite) — per-user data, admins see all |
| Session cache | Cloudflare KV |
| CRM | Dynamics 365 REST API |
| SharePoint | Microsoft Graph API |
| Hosting | Cloudflare Workers (serves both the static frontend and the API) |

### Roles

| Role | Can do |
|---|---|
| `user` | Calculator, agreements, version history, CRM link |
| `manager` | All of the above + price overrides |
| `admin` | All of the above + can see all users' opportunities |

---

## Project structure

```
pf-cloudsupport-calculator/
├── frontend/               # React + TypeScript app (Vite)
│   └── src/
│       ├── auth/           # MSAL token helpers
│       ├── api/            # API client (opps, sharepoint, users, crm)
│       ├── components/     # UI components
│       │   ├── DashboardView.tsx
│       │   ├── OppWorkspace.tsx
│       │   ├── Sidebar.tsx
│       │   └── calculator/ # Tab components (Calculator, Agreement, History, CRM, Team)
│       ├── hooks/          # useWindowWidth, useIsMobile
│       ├── lib/            # calcSupport, buildAgreementHtml, msoTiers, logoData
│       ├── pages/          # AppShell, LoginPage
│       ├── store/          # Zustand app store
│       └── types.ts
├── worker/                 # Cloudflare Worker (Hono)
│   └── src/
│       ├── routes/         # opps, users, sharepoint, crm
│       ├── auth.ts         # JWT verification
│       └── types.ts
├── wrangler.jsonc          # Cloudflare deployment config
└── .claude/
    └── index.html          # Original vanilla JS reference build
```

---

## Cloudflare config

| Setting | Value |
|---|---|
| Worker name | `cloudsupport-calculator` |
| D1 database | `cloudsupport-calculator` (`ce868146-d229-4266-b1f4-cc49fdcaa572`) |
| KV namespace | `7d73b362d1ba4f6f903bf60ff026d245` |
| Azure tenant | `c1b7e3af-ae3a-45b7-b840-4fe8ca013223` |
| Azure client | `d8acbc0c-0f98-4e6f-b755-0062264c1da5` |
| Dynamics URL | `https://packetfusioncrm.crm.dynamics.com` |

---

## Development

```bash
# Install dependencies
cd frontend && npm install
cd ../worker && npm install

# Run frontend dev server
cd frontend && npm run dev

# Deploy everything (builds frontend then deploys worker + assets)
npx wrangler deploy
```

---

## Changelog

### [2025-04-13]

**Mobile responsive layout**
- Sidebar becomes a fixed full-height overlay on screens narrower than 768 px, with a semi-transparent backdrop; tapping an opportunity auto-closes it
- Hamburger button (☰) appears in the topbar and on the dashboard on mobile
- Tab bar scrolls horizontally on mobile; labels shortened to fit
- Calculator input grids collapse from two columns to one on mobile
- Agreement tab: iframe preview kept on desktop; replaced with "Open in New Tab" button on mobile (uses `URL.createObjectURL`)
- Print/PDF button hidden on mobile
- `index.css` allows body scrolling on narrow viewports; inputs set to `font-size: 16px` to prevent iOS Safari zoom

**Dashboard landing page**
- Replaces the empty "no opportunity selected" state
- Time-based greeting (Good morning / afternoon / evening) using the signed-in user's first name
- Four stat cards: My Opportunities, My Pipeline (annual), Total Company Opps, Total Pipeline
- Recent Opportunities list — up to 6 entries sorted by last saved, click any row to open
- Quick Actions panel: New Opportunity, Team View, and a role info card
- Team View button selects the first available opportunity and switches directly to the Team tab

**Agreement document print / page-break fixes**
- Added `break-inside: avoid` to all card-type containers (pricing tables, coverage grids, scope blocks, term panels, MSO cards)
- Section headers use `break-after: avoid` to stay glued to the content below them
- Proposal signature band: `break-inside: avoid` + `break-before: avoid-page`
- Signature document signature section: `break-before: always` (forced onto its own page)
- MSO "What Your Engineer Delivers" heading wrapped inside the panels container; "Engineering Response SLA" heading wrapped inside the SLA table container so both travel with their sections

---

### [2025-04-12]

**MSO Engagement Tier selector**
- Added `msoTier` field to `OppFormData` (stored in D1 JSON blob; no schema migration needed)
- Four standard tiers: Essentials ($15k/yr), Professional ($24k/yr), Advanced ($42k/yr), Enterprise ($90k/yr), plus Custom (manual fee entry)
- Selecting a tier auto-fills the annual MSO fee and shows a description card in the calculator
- Tier data centralized in `frontend/src/lib/msoTiers.ts`

**Auto contract end date**
- Contract End date is computed automatically from Contract Start + Term and updates live as either field changes

**Tier-aware agreement documents**
- Both Proposal and Signature Page now include an inline MSO section when MSO is enabled: Engineering Resource Model dark card, 8-panel "What Your Engineer Delivers" grid, and a priority SLA table
- Essentials tier gets different SLA response times and business-hours coverage note vs. all other tiers
- Standalone MSO document mode removed; MSO content is injected inline into the existing documents

---

### [2025-04-11]

**React + TypeScript migration (initial)**
- Migrated from a single 3,600-line vanilla JS `index.html` to a React 19 + TypeScript frontend with a Cloudflare Worker API backend
- Azure AD SSO via MSAL.js replaces the localStorage user table
- Cloudflare D1 replaces localStorage for opportunity storage; per-user scoping enforced in the Worker, admins see all records
- Cloudflare KV used for session caching
- Dynamics 365 CRM integration: search accounts and opportunities, link to local records
- SharePoint integration: list document library folders from CRM-linked records, upload agreement HTML
- Full tab set: Calculator, Agreement Preview, Version History, CRM Link, Team View
