import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let errorCount = 0;
const ERROR_THRESHOLD = 5;
const WINDOW_MS = 5 * 60 * 1000;

setInterval(() => {
  errorCount = 0;
}, WINDOW_MS);

export async function notifyIfTooManyErrors() {
  errorCount++;
  if (errorCount === ERROR_THRESHOLD) {
    await sendTelegramAlert(
      `⚠️ Monitoring wykrył ${ERROR_THRESHOLD} błędów w ciągu ostatnich 5 minut!`
    );
  }
}

async function sendTelegramAlert(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    }
  );
}