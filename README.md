# daily-quote-bot

Telegram bot that will send you a nice quote every day to motivate you. You are the one who adds these quotes, by the way.

You can check out the working bot [here](https://t.me/imoutoquotebot).

The bot is built with [grammY](https://grammy.dev) and uses [Kysely](https://kysely.dev) + SQLite as database.

## Dev setup

Create `.env.development` based on `.env.example`, then run:

```bash
$ pnpm install

$ pnpm migrate:dev

$ pnpm dev
```

## Deployment

[PM2](https://pm2.keymetrics.io/) is used for handling the bot process on my deploy server. If you don't intend using it, edit the deploy script.

Create `.env.production` based on `.env.example`, then run:

```bash
$ pnpm install

$ pnpm prod:deploy
```

## Migrations

If you want to add a new migration, run:

```bash
$ pnpm migrate:make your_migration_name
```

Then after you have declared up and down function, update your types at `src/database/schema.d.ts` and run:

```bash
$ pnpm migrate:dev
```
