# RUNBOOK — Operations Playbook

---

## Deployment

### Normal deployment
Merge PR to `main` → GitHub Actions runs tests → Vercel auto-deploys. Takes ~60 seconds. You receive a Telegram notification on success.

### Manual deploy
```bash
vercel --prod
```

### Roll back
In Vercel dashboard → Deployments → click any previous deployment → Promote to Production.

Or via CLI:
```bash
vercel rollback
```

---

## Common issues

### Telegram webhook not receiving messages

```bash
# Check webhook status
curl "https://api.telegram.org/bot{TOKEN}/getWebhookInfo"

# Re-register (staging)
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://your-app.vercel.app/api/telegram"

# Re-register (local dev)
curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://xxxx.ngrok.io/api/telegram"
```

### Cron not firing

Check Vercel dashboard → Project → Cron Jobs tab. Logs show each execution.

To manually trigger any cron endpoint:
```bash
curl -H "Authorization: Bearer {CRON_SECRET}"   https://your-app.vercel.app/api/cron/daily-alert
```

### Supabase connection errors

Check env vars are correctly set in Vercel dashboard. Verify the service role key (not anon key) is used server-side.

```bash
# Test locally
node -e "
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from('restaurants').select('count').then(console.log).catch(console.error);
"
```

### Vercel function timeout (60s limit)

If onboarding or weekly report times out:
1. Check Langfuse for which step is slowest
2. Split into two chained API calls
3. Use Supabase to pass state between calls

### High Claude API costs

Check Langfuse dashboard for cost breakdown by restaurant_id and agent. Common causes: very long prompts, unexpected Sonnet calls, missing max_tokens limits.

---

## Monitoring

- **Vercel dashboard** — function logs, cron job history, deployment status
- **Langfuse dashboard** — LLM call traces, token costs per restaurant, error rates
- **Supabase dashboard** — database queries, row counts, connection pool

---

## Secret rotation

1. Generate new key at the relevant service
2. Update in Vercel dashboard → Settings → Environment Variables
3. Redeploy: `vercel --prod` or merge any commit to main
4. For Telegram: re-register webhook after token change

---

## Database migrations

```bash
# Apply new migration locally
supabase db push

# Apply to Supabase cloud (staging)
supabase db push --db-url postgresql://postgres:{PASSWORD}@{HOST}:5432/postgres
```

Always create migration files in `supabase/migrations/` — never modify schema directly in the dashboard.
