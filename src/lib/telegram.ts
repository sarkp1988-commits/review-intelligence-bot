import { Bot } from 'grammy';

if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing env var: TELEGRAM_BOT_TOKEN');
}

// Singleton Grammy bot instance. Import this wherever you need to send
// messages or build inline keyboards. The webhook handler will call
// bot.handleUpdate() — do not call bot.start() in serverless context.
export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
