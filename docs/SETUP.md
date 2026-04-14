# SETUP — Local Development Environment

From zero to a running local dev environment. Follow every step in order.

---

## Prerequisites

Accounts to create before starting:

- [Supabase](https://supabase.com) — free account
- [Anthropic](https://console.anthropic.com) — Claude API key
- [Google Cloud](https://console.cloud.google.com) — Places API key
- [Resend](https://resend.com) — email delivery
- [Langfuse](https://cloud.langfuse.com) — LLM tracing
- [Vercel](https://vercel.com) — free hobby account
- [ngrok](https://ngrok.com) — free account for local tunnel
- [@BotFather](https://t.me/BotFather) — create two Telegram bots (dev + staging)

---

## Step 1: Install Node.js 20

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.zshrc  # or ~/.bashrc
nvm install 20
nvm use 20
node --version  # should show v20.x.x
```

---

## Step 2: Install Supabase CLI

```bash
brew install supabase/tap/supabase
supabase --version
```

---

## Step 3: Install ngrok

```bash
brew install ngrok/ngrok/ngrok
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

---

## Step 4: Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

---

## Step 5: Clone the repository

```bash
git clone git@github.com:sarkp1988-commits/review-intelligence-bot.git
cd review-intelligence-bot
npm install
```

---

## Step 6: Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. See `docs/DEPENDENCIES.md` for where to get each one.

---

## Step 7: Start local Supabase

```bash
supabase init        # first time only
supabase start       # starts local Postgres on localhost:54322
supabase db push     # applies schema migrations
```

Your local DB URL will be printed — add it to `.env.local` as `SUPABASE_URL` for local dev.

---

## Step 8: Run the development server

```bash
npm run dev
# App running on http://localhost:3000
```

---

## Step 9: Expose to Telegram via ngrok

```bash
# In a new terminal
ngrok http 3000
# Copy the https://xxxx.ngrok.io URL
```

Register as your dev bot's webhook:
```bash
curl "https://api.telegram.org/bot{DEV_BOT_TOKEN}/setWebhook?url=https://xxxx.ngrok.io/api/telegram"
```

---

## Step 10: Verify everything works

```bash
# Health check
curl http://localhost:3000/api/health

# Send a message to your dev Telegram bot
# You should see it logged in npm run dev output
```

---

## Step 11: Connect Vercel for staging

```bash
vercel link    # link local repo to Vercel project
vercel env add TELEGRAM_BOT_TOKEN    # add staging bot token
# Repeat for all env vars from .env.example
```

Or add env vars via Vercel dashboard → Project → Settings → Environment Variables.

Staging auto-deploys every time you merge to `main`.

---

## Day-to-day dev startup

```bash
# Terminal 1
supabase start
npm run dev

# Terminal 2
ngrok http 3000
# Paste new ngrok URL as webhook if it changed
```

ngrok free tier gives a new URL each restart — update your dev bot webhook each session. Upgrade to ngrok paid ($8/month) for a stable URL if this gets annoying.

---

## Adding environment variables

When a new env var is needed:
1. Add to `.env.local` (local)
2. Add to `.env.example` with comment (no value)
3. Add in Vercel dashboard for staging
4. Add to `docs/DEPENDENCIES.md` reference table
5. Add to GitHub Actions secrets if used in CI
