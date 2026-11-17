# Configuration Guide

## Environment variables

`.env` (copy from `.env.example`):

```env
DISCORD_TOKEN=your_discord_bot_token
JENA_API_KEY=          # optional, unused placeholder
```

- `DISCORD_TOKEN` - required bot token.
- `JENA_API_KEY` - reserved for the future Jena integration; nothing reads it yet.

## Gateway intents

`src/bot.ts`:

```typescript
intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
],
```

- `GuildMessages` - required to receive `messageCreate` at all.
- `MessageContent` - privileged; enable **Message Content Intent** under Bot -> Privileged Gateway Intents in the Discord Developer Portal. Without it `message.content` is empty and the assistant stays silent.

## Feature configuration

Runtime behaviour of the AnimeX link assistant is code configuration, not environment variables: see `src/features/message-assistant/config.ts` and `reference/message-assistant.md`.

## Build and run

```bash
bun run build   # clean, tsc, oxlint --fix
bun start       # runs build/bot.js
bun run test    # typecheck + tests
```

Dependencies are limited to `discord.js`, `dotenv` and `logena`; tests use the Bun test runner.
