# JenX - AI Agent Guide

Discord bot: TypeScript (strict), discord.js v14, Bun runtime, dynamic filesystem loader.

## Entry points

- `src/bot.ts` - client, intents, login. Requires `Guilds`, `GuildMessages` and `MessageContent` (privileged, enable it in the Discord Developer Portal).
- `src/kernel/register.ts` - loads and registers every command/event at `clientReady`.

## Layout

- `src/kernel/` - loader (`load.ts`), filesystem helpers, registry, types. Do not add manual registration.
- `src/commands/{category}/{command}/` - `index.ts` definition + `{type}.ts` handler (`chatInput`, `userContext`, `messageContext`).
- `src/events/{eventName}/` - one file per responsibility; a listener exports `execute` (plus optional `name`/`once`). Reference: `src/events/interactionCreate/commands.ts`.
- `src/features/message-assistant/` - deterministic AnimeX link assistant: `config.ts` (all matching/response rules), `matcher.ts` (evidence-point scorer), `cooldown.ts` (per-channel reply throttle).
- `src/services/` - external API placeholders (empty).

## Rules

- Commands and events are auto-discovered; creating the file is the registration.
- A file in an event folder that is not a listener exports `event = false` and is called by that folder's `index.ts` (see `src/events/messageCreate/`).
- The link assistant is keyword/regex only: no AI, ML, external calls or new dependencies.
- Trigger words, patterns, weights, threshold, cooldown length, section links and embed content all live in `src/features/message-assistant/config.ts`. Never hardcode them in handlers.
- Confidence is an integer heuristic score out of 100 (topic + intent + name + section), not a probability; the footer says "heuristic confidence" and must keep saying so. The cooldown is per channel (60 s), never per user.
- `tests/fixtures/animex-links.ts` holds evaluation examples, not training data and not runtime config.
- Command definitions must export `command` with `name`; there is no folder-name fallback and no default-export alias.

## Commands

```bash
bun run build     # clean + tsc + oxlint --fix
bun run typecheck # typecheck src + tests (tsconfig.test.json -> .test-build)
bun run test      # typecheck, then the same suite under Bun and Node
bun run test:bun  # Bun runner only
bun run test:node # compiles and runs with node --test
bun start         # run build/bot.js
```

Tests import from `node:test` and `node:assert/strict` only, never `bun:test`, so one suite covers both runtimes. Do not add a second Node-only suite or an npm lockfile.

## Docs

`.codex/README.md` is the index.
