# Tata Nails — Telegram Mini App

A static, mobile-first Telegram Mini App for presenting the manicure course and routing buyers to Tribute payment links.

## Deploy

The Vercel project should use the mini-app/ directory as its Root Directory. The app is plain static HTML and does not require a build step or server-side environment variables.

## Configure before publishing payments

Open index.html and replace the placeholders near the start of the final script:

- PAYMENT_URL_RUB — exact Tribute deep link for RUB payments.
- PAYMENT_URL_USD — exact Tribute deep link for USD payments.
- COURSE_PRICE_RUB — confirmed course price in rubles.
- COURSE_PRICE_USD — confirmed course price in US dollars.

The payment buttons intentionally show a notice instead of opening placeholder URLs. They call Telegram.WebApp.openLink(url) once a real URL is configured. Outside Telegram, they use a regular browser tab as a local-preview fallback.

The course outline and marketing copy are starter text. Verify that each module matches the actual lessons before taking payments.

## Add the Mini App button to a Telegram bot

Use the final HTTPS Vercel URL in a web_app button. For example, with aiogram:

~~~python
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo

MINI_APP_URL = "https://YOUR-PROJECT.vercel.app"

keyboard = InlineKeyboardMarkup(inline_keyboard=[
    [InlineKeyboardButton(
        text="Открыть курс",
        web_app=WebAppInfo(url=MINI_APP_URL),
    )]
])
~~~

Set the bot's domain / Mini App settings in BotFather as required by Telegram. Keep payment configuration in the HTML file; do not put bot tokens or other secrets in this static frontend.
