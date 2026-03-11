![img.png](SafeBeat%20logo%20transparent.png)
# SafeBeat 🎵

A Telegram bot that sends musical content to Israelis during missile alerts (צבע אדום). When an alert fires, subscribed users receive a music link matched to their preferred mood, so they have something soothing to focus on while going to the shelter.

All user-facing text is in **Hebrew**.

[Live Telegram Bot](https://t.me/safe_beat_bot) - `/start` to turn it on

![img.png](screenshot.png)

---

## How it works

1. **Polling** — the bot polls the [HomeFront](https://www.oref.org.il/WarningMessages/alert/alerts.json) API every 2.5 seconds for active alerts.
2. **Deduplication** — each alert is processed exactly once across all bot replicas using Redis atomic locks.
3. **Fan-out** — every user subscribed to an affected city receives a personalized message with a music link.
4. **Rate limiting** — a user will not receive more than one message per 90 seconds, even if multiple alerts overlap.

### Message content

Users choose their preferred mood (content mode) during onboarding:

| Mode | Description |
|------|-------------|
| מרגיע | Calming / ambient |
| מצחיק | Funny / uplifting |
| ילדים | Kids-friendly |
| קצבי | Upbeat / rhythmic |

And their preferred platforms: **YouTube** or **Spotify**.

If it's nighttime and the user has selected kids mode, a white-noise link is also included to help kids fall back asleep.

---

## Bot commands

| Command | Description                                           |
|---------|-------------------------------------------------------|
| `/start` | Register / update subscription (city, mode, platform) |
| `/stop` | Unsubscribe from alerts                               |

---

## Prerequisites

- **Node.js** 20+
- **Redis** 7+
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/idangin1/safe-beat.git
cd safe-beat
npm install
```

### 2. Configure environment

Copy the example below into a `.env` file in the project root:

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional — defaults shown
REDIS_URL=redis://localhost:6379
RED_ALERT_API_URL=https://www.oref.org.il/WarningMessages/alert/alerts.json
POLL_INTERVAL_MS=2500
DEDUP_TTL_SECONDS=30
DEDUP_USER_TTL_SECONDS=120
TELEGRAM_SEND_CONCURRENCY=50
TELEGRAM_RETRY_ATTEMPTS=3
HEALTH_PORT=3001
LOG_LEVEL=info
NODE_ENV=development
RATE_LIMIT_COMMANDS=10
```

### 3. Fill in the playlists

Edit the JSON files under `data/playlists/` to add real YouTube / Spotify links for each mood:

```
data/playlists/calm.json
data/playlists/funny.json
data/playlists/kids.json
data/playlists/upbeat.json
```

Each file is an array of objects with the shape:

```json
[
  {
    "id": "unique-id",
    "platform": "youtube",
    "url": "https://www.youtube.com/watch?v=...",
    "title": "Song Name"
  }
]
```

### 4. Run

```bash
# Development (watch mode)
npm run dev

# Production
npm run build
npm start
```

---

## Project structure

```
src/
  index.ts                   — entry point, wires all services
  config/env.ts              — Zod-validated environment config
  types/index.ts             — shared TypeScript interfaces
  bot/
    bot.ts                   — GrammY bot factory
    commands/                — /start and /stop handlers
    conversations/onboarding.ts — multi-step registration flow
    middleware/rate-limit.ts
  alert-poller/poller.ts     — polls homefront API
  alert-processor/
    processor.ts             — dedup → fan-out pipeline
    AlertMessageBuilder.ts   — builds the Hebrew message
  content-selector/selector.ts — picks a random playlist item
  deduplication/dedup.ts     — Redis-based alert & user dedup
  user-store/redis-store.ts  — persists user preferences
  sender/telegram-sender.ts  — sends messages with retry logic
  health/server.ts           — Fastify health-check endpoint
data/
  cities.json                — canonical city list (Hebrew)
  playlists/                 — per-mood playlist files
```

---

## Health check

A lightweight HTTP server runs on `HEALTH_PORT` (default `3001`):

```
GET /health  →  200 OK
```

Useful for Docker / Kubernetes liveness probes.

---

## License

[ISC](LICENSE.txt)