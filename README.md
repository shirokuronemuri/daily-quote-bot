# daily-quote-bot

Telegram bot that will send you some nice quotes (which you set youself)

## Dev setup

Create `.env.development` based on `.env.example`, then run:

```bash
pnpm install

pnpm dev
```

## Deployment

[PM2](https://pm2.keymetrics.io/) is used for handling the bot process on my deploy server. If you don't intend using it, edit the deploy script.

Create `.env.production` based on `.env.example`, then run:

```bash
$ pnpm install

$ pnpm prod:deploy
```
