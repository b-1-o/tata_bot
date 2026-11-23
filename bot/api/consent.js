const { createHmac, timingSafeEqual } = require("node:crypto");

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const OWNER_TELEGRAM_ID = process.env.OWNER_TELEGRAM_ID || "";
const OFFER_VERSION = process.env.OFFER_VERSION || "";
const OFFER_SHA256 = process.env.OFFER_SHA256 || "";
const OFFER_URL = process.env.OFFER_URL || "";
const PRODUCTION_MINI_APP_ORIGIN =
  process.env.MINI_APP_ORIGIN || "https://tata-course-miniapp.vercel.app";

const MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60;
const MAX_FUTURE_CLOCK_SKEW_SECONDS = 60;

function setCorsHeaders(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "600");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
}

function isAllowedOrigin(origin) {
  if (typeof origin !== "string") return false;
  if (origin === PRODUCTION_MINI_APP_ORIGIN) return true;
  if (process.env.VERCEL_ENV === "preview") {
    return /^https:\/\/tata-course-miniapp-[a-z0-9-]+\.vercel\.app$/i.test(origin);
  }
  return false;
}

function isValidOfferConfiguration() {
  if (!OFFER_VERSION || OFFER_VERSION.length > 40) return false;
  if (!/^[a-f0-9]{64}$/i.test(OFFER_SHA256)) return false;
  try {
    const url = new URL(OFFER_URL);
    return url.protocol === "https:" &&
      url.hostname === "tata-course-miniapp.vercel.app" &&
      url.pathname === "/offer.html";
  } catch (_) {
    return false;
  }
}

function safeEqualHex(left, right) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function validateTelegramInitData(initData) {
  if (typeof initData !== "string" || initData.length < 20 || initData.length > 12000) {
    return { ok: false, code: "invalid_init_data" };
  }
  if (!BOT_TOKEN) return { ok: false, code: "service_not_configured" };

  const params = new URLSearchParams(initData);
  const seen = new Set();
  for (const [key] of params.entries()) {
    if (seen.has(key)) return { ok: false, code: "invalid_init_data" };
    seen.add(key);
  }

  const receivedHash = params.get("hash") || "";
  if (!/^[a-f0-9]{64}$/i.test(receivedHash)) {
    return { ok: false, code: "invalid_init_data" };
  }

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => key + "=" + value)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const calculatedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqualHex(calculatedHash, receivedHash)) {
    return { ok: false, code: "invalid_init_data" };
  }

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(authDate) ||
    authDate <= 0 ||
    authDate > now + MAX_FUTURE_CLOCK_SKEW_SECONDS ||
    now - authDate > MAX_INIT_DATA_AGE_SECONDS
  ) {
    return { ok: false, code: "expired_init_data" };
  }

  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch (_) {
    return { ok: false, code: "invalid_init_data" };
  }
  if (!user || !Number.isSafeInteger(user.id) || user.id <= 0) {
    return { ok: false, code: "invalid_init_data" };
  }
  return { ok: true, user };
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function formatUtc(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).format(date) + " UTC";
}

async function sendOwnerNotification(message) {
  const response = await fetch(
    "https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: OWNER_TELEGRAM_ID,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(10000)
    }
  );
  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.ok !== true) {
    throw new Error(result && result.description
      ? result.description
      : "Telegram sendMessage failed with HTTP " + response.status);
  }
  return result.result;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ ok: false, code: "origin_not_allowed" });
  }
  setCorsHeaders(res, origin);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ ok: false, code: "method_not_allowed" });
  }

  if (!BOT_TOKEN || !/^\d{5,20}$/.test(OWNER_TELEGRAM_ID)) {
    return res.status(503).json({ ok: false, code: "service_not_configured" });
  }
  if (!isValidOfferConfiguration()) {
    return res.status(503).json({ ok: false, code: "offer_not_configured" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (body.accepted !== true) {
    return res.status(400).json({ ok: false, code: "consent_required" });
  }
  const requestId = typeof body.requestId === "string" ? body.requestId : "";
  if (!/^[a-z0-9-]{12,80}$/i.test(requestId)) {
    return res.status(400).json({ ok: false, code: "invalid_request_id" });
  }

  const validation = validateTelegramInitData(body.initData);
  if (!validation.ok) {
    const status = validation.code === "service_not_configured" ? 503 : 401;
    return res.status(status).json({ ok: false, code: validation.code });
  }

  const user = validation.user;
  const displayName = [user.first_name, user.last_name]
    .filter((part) => typeof part === "string" && part.trim())
    .join(" ");
  const username = typeof user.username === "string" && user.username.trim()
    ? "@" + escapeHtml(user.username)
    : "не указан";
  const acceptedAt = new Date();
  const message = [
    "<b>TATA NAILS — новое согласие с офертой</b>",
    "",
    "<b>ID согласия:</b> <code>" + escapeHtml(requestId) + "</code>",
    "<b>Покупатель:</b> " + username,
    "<b>Имя:</b> " + escapeHtml(displayName || "Не указано"),
    "<b>Telegram ID:</b> <code>" + user.id + "</code>",
    "<b>Дата и время:</b> " + formatUtc(acceptedAt),
    "<b>Документ:</b> " + escapeHtml(OFFER_VERSION),
    "<b>SHA-256 документа:</b> <code>" + OFFER_SHA256.toLowerCase() + "</code>",
    '<a href="' + escapeHtml(OFFER_URL) + '">Открыть публичную оферту</a>',
    "",
    "<b>Статус оплаты:</b> ещё не подтверждена.",
    "<b>Следующий шаг:</b> покупателю будет показан выбор валюты."
  ].join("\n");

  try {
    const telegramMessage = await sendOwnerNotification(message);
    return res.status(200).json({
      ok: true,
      notified: true,
      consentId: requestId,
      acceptedAt: acceptedAt.toISOString(),
      notificationMessageId: telegramMessage.message_id
    });
  } catch (error) {
    console.error("Tata Nails consent notification failed:", error.message);
    return res.status(502).json({ ok: false, code: "owner_notification_failed" });
  }
};
