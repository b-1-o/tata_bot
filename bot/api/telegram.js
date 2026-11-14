const { timingSafeEqual } = require("node:crypto");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MINI_APP_URL =
  process.env.MINI_APP_URL || "https://tata-course-miniapp.vercel.app/";

async function callTelegram(method, payload) {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN is not configured.");
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) {
    throw new Error(
      `Telegram API ${method} failed: ${result?.description || response.statusText}`,
    );
  }

  return result.result;
}

function hasValidWebhookSecret(receivedSecret) {
  if (!WEBHOOK_SECRET || typeof receivedSecret !== "string") return false;

  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(WEBHOOK_SECRET);

  return (
    received.length === expected.length &&
    timingSafeEqual(received, expected)
  );
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Tata Nails Bot webhook",
      configured: Boolean(BOT_TOKEN && WEBHOOK_SECRET),
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  if (!BOT_TOKEN || !WEBHOOK_SECRET) {
    return res.status(503).json({
      ok: false,
      error: "Bot environment variables are not configured",
    });
  }

  const receivedSecret = req.headers["x-telegram-bot-api-secret-token"];
  if (!hasValidWebhookSecret(receivedSecret)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const message = req.body?.message;
  const messageText = typeof message?.text === "string" ? message.text : "";
  const isStartCommand = /^\/start(?:@\w+)?(?:\s|$)/.test(messageText);

  if (!message || message.chat?.type !== "private" || !isStartCommand) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const chatId = message.chat.id;

  // The per-chat menu button keeps the Mini App available after the greeting.
  try {
    await callTelegram("setChatMenuButton", {
      chat_id: chatId,
      menu_button: {
        type: "web_app",
        text: "Курсы маникюра",
        web_app: { url: MINI_APP_URL },
      },
    });
  } catch (error) {
    // The inline button below still opens the Mini App if this optional call fails.
    console.error("setChatMenuButton failed:", error.message);
  }

  try {
    await callTelegram("sendMessage", {
      chat_id: chatId,
      text:
        "<b>Добро пожаловать в Tata Nails!</b>\n\n" +
        "Здесь вы можете познакомиться с онлайн-курсом по маникюру, " +
        "посмотреть программу и выбрать удобный способ оплаты.\n\n" +
        "Нажмите кнопку ниже, чтобы открыть курс.",
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Открыть курс",
              web_app: { url: MINI_APP_URL },
            },
          ],
        ],
      },
    });
  } catch (error) {
    console.error("sendMessage failed:", error.message);
    return res.status(502).json({ ok: false, error: "Could not send welcome message" });
  }

  return res.status(200).json({ ok: true });
};
