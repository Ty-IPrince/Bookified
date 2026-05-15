# Bookified

Voice-first AI book companion. Upload a PDF → talk to it in real time using voice.

Live Demo: [bookified-cyan.vercel.app](https://bookified-cyan.vercel.app)

## Features

- Upload PDFs and chat with them using natural voice
- Real-time streaming transcripts (user + assistant)
- Multiple AI personas per book
- Clerk authentication + subscription plans (Free / Standard / Pro)
- Usage limits enforced by plan
- Modern UI with shadcn/ui + Tailwind

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Voice AI**: Vapi + ElevenLabs
- **Auth & Billing**: Clerk
- **Database**: MongoDB + Mongoose
- **Deployment**: Vercel

## Plan Limits

| Feature              | Free     | Standard   | Pro       |
|----------------------|----------|------------|-----------|
| Books                | 1        | 10         | 100       |
| Sessions/month       | 5        | 100        | Unlimited |
| Max session length   | 5 min    | 15 min     | 60 min    |
| Session history      | No       | Yes        | Yes       |

## Quick Start

1. Clone the repo
```bash
git clone https://github.com/Ty-IPrince/Bookified.git
cd Bookified
```
2. Install dependencies
```bash
npm install
```
3. Create .env.local
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

NEXT_PUBLIC_VAPI_API_KEY=...
ELEVENLABS_API_KEY=...

MONGODB_URI=your_mongodb_connection_string
```
4. Run locally
```bash
npm run dev
```

# Environment Variables

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key |
| `CLERK_SECRET_KEY` | Clerk backend key |
| `NEXT_PUBLIC_VAPI_API_KEY` | Vapi public key |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS key |
| `MONGODB_URI` | MongoDB connection string |

# Project Structure

### Project Structure

```text
app/              # Next.js App Router
components/       # Reusable UI components
hooks/            # Custom hooks (useVapi)
lib/
  actions/        # Server actions
  models/         # Mongoose models
  utils/          # Utilities
database/         # Database queries
```

# Subscription Plans
Plans are managed via Clerk. Visit /subscriptions to upgrade.

# Contributing
Not accepting contributions at this time (personal project).
