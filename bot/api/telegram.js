const { timingSafeEqual } = require("node:crypto");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const MINI_APP_URL =
  process.env.MINI_APP_URL || "https://tata-course-miniapp.vercel.app/";
const WELCOME_IMAGE_URL = "https://tata-nails-bot.vercel.app/welcome-card.jpeg?v=193d28e3";

function getLanguage(languageCode) {
  return typeof languageCode === "string" &&
    languageCode.toLowerCase().startsWith("en")
    ? "en"
    : "ru";
}

function getMiniAppUrl(language) {
  const url = new URL(MINI_APP_URL);
  url.searchParams.set("lang", language);
  return url.toString();
}

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
  const language = getLanguage(message.from?.language_code);
  const miniAppUrl = getMiniAppUrl(language);

  // Keep a language-specific Mini App URL in this user's private chat menu.
  try {
    await callTelegram("setChatMenuButton", {
      chat_id: chatId,
      menu_button: {
        type: "web_app",
        text: language === "en" ? "Courses" : "Курсы",
        web_app: { url: miniAppUrl },
      },
    });
  } catch (error) {
    console.error("setChatMenuButton failed:", error.message);
  }

  const caption =
    "<b>Добро пожаловать в Tata Nails!</b>\n\n" +
    "Здесь вы можете познакомиться с онлайн-курсом по маникюру, " +
    "посмотреть программу и выбрать удобный способ оплаты.\n\n" +
    "Нажмите кнопку ниже, чтобы открыть курс.\n\n" +
    "──────────────\n\n" +
    "<b>Welcome to Tata Nails!</b>\n\n" +
    "Here you can explore our online manicure course, view the curriculum " +
    "and choose a convenient payment method.\n\n" +
    "Tap the button below to open the course.";

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: language === "en" ? "Open course" : "Открыть курс",
          web_app: { url: miniAppUrl },
        },
      ],
    ],
  };

  try {
    await callTelegram("sendPhoto", {
      chat_id: chatId,
      photo: WELCOME_IMAGE_URL,
      caption,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
    });
  } catch (photoError) {
    // If Telegram cannot load the image, still deliver the welcome text and button.
    console.error("sendPhoto failed, using text fallback:", photoError.message);

    try {
      await callTelegram("sendMessage", {
        chat_id: chatId,
        text: caption,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
        disable_web_page_preview: true,
      });
    } catch (messageError) {
      console.error("sendMessage fallback failed:", messageError.message);
      return res.status(502).json({
        ok: false,
        error: "Could not send the welcome card",
      });
    }
  }

  return res.status(200).json({ ok: true, language });
};
