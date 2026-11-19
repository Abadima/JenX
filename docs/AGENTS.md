# JenX - AI Agent Guide

Discord bot: TypeScript (strict, ESM), discord.js v14, filesystem loader for commands and events. Bun installs dependencies and runs tests; the bot runs as compiled JavaScript on Node. Where this file and the code disagree, the code wins.

## The bot runs `build/`, not `src/`

`bun start` is `node .` -> `build/bot.js` and does not build; the loader scans the compiled `build/commands` and `build/events`. After any change under `src/`, run `bun run build` and restart the bot.

## Entry points

- `src/bot.ts` - logs in with `DISCORD_TOKEN` (required). Intents: `Guilds`, `GuildMessages`, `MessageContent` (privileged; enable it in the Developer Portal).
- `src/kernel/register.ts` - at `clientReady` loads every command and event and replaces the bot's global slash commands. A load failure exits with code 1.

## Layout

- `src/kernel/` - loader, registry, types. Do not add manual registration.
- `src/commands/{category}/{command}/` - `index.ts` exports `command` (`name`, `description`, `types`); `{type}.ts` exports `data` and `execute`. Only slash commands are dispatched; a `userContext` or `messageContext` command would register and never run.
- `src/events/{eventName}/` - every `.js` file must export `execute`; the name is the `name` export, else the folder (for `index`), else the file name. A helper that is not a listener exports `event = false`.
- `src/features/message-assistant/` - the AnimeX link assistant; reference in `docs/reference/message-assistant.md`.
- `scripts/typo-guard.ts` - regenerates the typo guard list (run with `bun`, not compiled).
- `tests/` - matcher tests and fixtures.
- `src/components/`, `src/services/**` and `src/events/clientReady/` are empty untracked directories; there are no AnimeX or Jena clients.

## Link assistant rules

- Keyword/regex only: no AI, ML, external calls or new dependencies.
- Everything it reacts to (vocabulary, frames, weights, threshold, limits, cooldown, embed copy) lives in `config.ts`; never hardcode it in `matcher.ts` or the handler.
- Frames are written for canonical text (apostrophes removed, so `i'd` is `id`) and never use the `g` flag.
- Confidence is a heuristic, not a probability; the footer reads `{confidence}% Confidence | {ms}ms`. The threshold gets moved, so tests use the config values, not literals.
- Section words (`home`, `schedule`, ...) are never topic evidence on their own.
- After changing `typos.targets` or the frame vocabulary, regenerate `TYPO_GUARD` (command in `scripts/typo-guard.ts`).
- For a reported miss or false positive, add the message to `tests/fixtures/animex-links.ts`, watch it fail, then fix the rule, not the phrase.

## Commands

```bash
bun install
bun run build         # node build.js: delete build/, tsc, then oxlint --fix
bun run build:watch   # tsc --watch + oxlint --fix
bun start             # node . (does not build)
bun test tests        # the test suite
```

`oxlint --fix` can rewrite source files; check `git diff` after building.

**Broken:** `typecheck`, `test`, `test:bun` and `test:node` run `tsc --project tsconfig.test.json`, which does not exist, so CI's test step fails. Use `bun test tests` meanwhile.

## Tooling

- 4-space indent, double quotes, semicolons, relative imports end in `.js`.
- `tsconfig.json` is strict and includes only `src/`, so tests and scripts are not type-checked.
- Tests import `node:test` and `node:assert/strict`, never `bun:test`. Only the matcher is tested.
- `oxlint` has no config; `oxfmt` is installed but unused, so do not mass-format. Lockfiles are gitignored.
- `JENA_API_KEY` is in `.env.example` but nothing reads it.
