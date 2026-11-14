const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

async function main() {
  loadEnvFile(path.resolve(process.cwd(), ".env.local"));
  loadEnvFile(path.resolve(process.cwd(), ".env"));

  const token = process.env.BOT_TOKEN;
  const secret = process.env.WEBHOOK_SECRET;
  const webhookUrl =
    process.env.WEBHOOK_URL || "https://tata-nails-bot.vercel.app/api/telegram";

  if (!token) throw new Error("BOT_TOKEN is missing in .env.local.");
  if (!secret) throw new Error("WEBHOOK_SECRET is missing in .env.local.");
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    throw new Error("WEBHOOK_SECRET must contain 1–256 letters, numbers, underscores or hyphens.");
  }
  if (!webhookUrl.startsWith("https://")) {
    throw new Error("WEBHOOK_URL must use HTTPS.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram returned HTTP ${response.status}`);
  }

  console.log("Telegram webhook configured successfully.");
  console.log(`Webhook URL: ${webhookUrl}`);
  console.log("The bot will now answer /start using the Vercel Function.");
}

main().catch((error) => {
  console.error("Webhook setup failed:", error.message);
  process.exitCode = 1;
});
