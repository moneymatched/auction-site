# Acrebid

A modern, real-time land auction platform built with Next.js and Supabase. Features frictionless bidding, anti-sniping protection, proxy bidding, and interactive map views.

## Features

- **Real-time Bidding** — Live auction updates via Supabase Realtime
- **Anti-Sniping Protection** — Auctions auto-extend by 5 minutes when bids are placed in the final 5 minutes
- **Proxy / Maximum Bidding** — Set a maximum bid and let the system automatically bid for you when outbid
- **Interactive Maps** — View all properties on a single map or explore individual property locations
- **Frictionless Registration** — Bidders only need email and phone number to participate
- **Offline Payment** — Payment handled after auction closes
- **Admin Dashboard** — Full auction management, live monitoring, bid export, and winner contact details
- **Mobile Responsive** — Beautiful, modern UI that works on all devices

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (PostgreSQL + Realtime)
- **Maps:** Google Maps JavaScript API
- **Deployment:** Vercel (recommended)

## Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Google Maps API key ([console.cloud.google.com](https://console.cloud.google.com))

## Quick Start

1. **Clone and install dependencies:**

```bash
git clone <your-repo-url>
cd auction-site
npm install
```

2. **Set up Supabase:**
   - Create a new Supabase project
   - Run all migrations in `supabase/migrations/` via SQL Editor (001, 002, 003, 004, 005)
   - Create a storage bucket named `property-images` (make it public)
   - Create an admin user: Authentication → Users → Add User

3. **Configure environment variables:**

Create a `.env.local` file (see `.env.example` for reference):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_WINNER_INSTRUCTIONS="Your custom winner instructions..."
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Access the site:**
   - **Public site:** http://localhost:3000
   - **Admin panel:** http://localhost:3000/admin (login with your Supabase user)

## Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add all environment variables in Vercel Dashboard → Settings → Environment Variables.

See [SETUP.md](./SETUP.md) for detailed deployment instructions and admin workflow.

## Project Structure

```
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── auctions/          # Public auction pages
│   │   └── api/               # API routes
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions
│   └── types/                 # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
└── public/                    # Static assets
```

## Key Concepts

### Anti-Sniping / Soft Close

When a bid is placed within the final 5 minutes (300 seconds) of an auction, the timer extends by an additional 5 minutes. This repeats with each new bid in the extension window, preventing last-second sniping.

### Proxy Bidding

Bidders can enable "Use as maximum bid" when placing a bid. The system will automatically place incremental bids on their behalf (up to their maximum) whenever they are outbid. Multiple proxy bidders compete automatically until one reaches their max.

### Winner Instructions

After an auction ends, the winner sees post-auction instructions. Admins can set:
- A site-wide default via `NEXT_PUBLIC_WINNER_INSTRUCTIONS` env var
- A per-auction override in the admin form (optional)

## Admin Workflow

1. **Add a property** → Admin → Properties → Add Property
2. **Upload photos** → After saving property
3. **Create an auction** → Admin → Auctions → New Auction → Select property, set dates and starting bid
4. **Go live** → Click "Go Live" button when ready to start
5. **Monitor bidding** → Real-time bid updates, manual timer extensions
6. **Export results** → Export CSV of all bids, view winner contact info

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

## License

Private project. All rights reserved.
