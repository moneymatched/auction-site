# Going Going Gobbi — Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Also copy the **service_role key** (keep this secret)
4. Apply database migrations (required for registration, proxy bids, invoices, etc.):
   - **Recommended:** [Supabase CLI](https://supabase.com/docs/guides/cli) — `supabase link` then `supabase db push`
   - **Or** run every file under `supabase/migrations/` in numeric order (`001_…` through `011_…`) in the SQL Editor
5. Create a Storage bucket named `property-images` (Storage → New bucket → Public: YES)
6. Create your admin user: Authentication → Users → Add User (use email/password)

**Note:** Admin operations (properties, photos, auctions) use API routes with the service role, so you don't need to configure RLS policies for those tables.

## 2. Configure Environment Variables

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...

# Optional (for direct invoice emails from app)
RESEND_API_KEY=re_...
INVOICE_FROM_EMAIL=info@acrebid.com
```

## 3. Get a Google Maps API Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable: **Maps JavaScript API** and **Places API**
3. Create an API key and restrict it to your domain

## 4. Run Locally

```bash
npm run dev
```

Visit:
- **Public site**: http://localhost:3000
- **Admin**: http://localhost:3000/admin (login with the Supabase user you created)

## 5. Deploy to Vercel

```bash
npx vercel
```

Add the same environment variables in Vercel Dashboard → Settings → Environment Variables.

## 6. Workflow

### Add a Property
1. Admin → Properties → Add Property
2. Fill in title, description, address, acreage, zoning
3. Click map to set GPS coordinates
4. Save → then upload photos

### Create an Auction
1. Admin → Auctions → New Auction
2. Select property, set dates, starting bid, min increment
3. Auto-extend: both trigger window and extension default to 300 seconds (5 min) — adjust as needed
4. Set status to **Upcoming** initially

### Go Live
1. Admin → Auctions → [Select auction]
2. Click **Go Live** when ready
3. Monitor real-time bids in the admin panel
4. Use +5m / +10m / +30m buttons to manually extend if needed
5. When auction ends, use the **Winner Invoice** panel to:
   - Add invoice notes/payment instructions
   - Save draft invoice details
   - Email invoice directly to the winner
6. Click **Export CSV** for full bid list if needed

## Auto-extend Behavior

When a bid is placed within the final `auto_extend_threshold` seconds (default 300 = 5 min):
- The end time extends by `auto_extend_seconds` (default 300 = 5 min)
- A banner flashes on the public auction page: "Time Extended!"
- The timer resets and starts counting down from the new end time
- This repeats each time a new bid is placed in the final window
