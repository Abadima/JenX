# Modules Reference

## Kernel

| File | Purpose |
| --- | --- |
| `src/kernel/load.ts` | `loadCommands()`, `loadEvents()`; enforces the file contracts and the `event = false` rule |
| `src/kernel/loadFiles.ts` | `readEntries()` - one directory read returning `{ directories, files }` |
| `src/kernel/register.ts` | Registers listeners and application commands; the single listener error boundary |
| `src/kernel/registry.ts` | `setCommands()`, `getCommand()` in-memory map |
| `src/kernel/types.ts` | `CommandInteractions` (type -> interaction map), `CommandDefinition`, `CommandEntry`, `LoadedCommand`, `LoadedEvent` |

`src/bot.ts` loads `.env`, creates the client (intents `Guilds`, `GuildMessages`, `MessageContent`), and exits non-zero if registration fails.

## Events

### `src/events/interactionCreate/commands.ts`

`name = "interactionCreate"`, `once = false`. Takes a generic `Interaction`, ignores non-command interactions, looks the command up with `getCommand()`, replies ephemerally when unknown, otherwise runs `command.chatInput.execute()`.

### `src/events/messageCreate/index.ts`

`name = "messageCreate"`, `once = false`. Orchestration only: drops bot and webhook messages, then calls `handleAnimeXLinks()`. Empty/irrelevant text is rejected by the matcher, and errors are logged by the kernel wrapper.

### `src/events/messageCreate/animexlinks.ts`

`event = false` helper (not a listener). Takes a `LinkRequestMessage` (content, channelId, author, reply), claims the channel cooldown, builds the embed from config, replies, then confirms the cooldown (releases it if the reply throws). Behaviour: `message-assistant.md`.

## Feature: `src/features/message-assistant/`

| File | Purpose |
| --- | --- |
| `config.ts` | Matching, section and embed configuration (`ANIMEX_LINKS_CONFIG`, `SECTION_KEYS`) |
| `matcher.ts` | `normalize()`, `matchAnimeXLinks()`; deterministic scorer over canonical text |
| `cooldown.ts` | `ChannelCooldown`: per-channel expiry map with in-flight reservations, pruning and release |

Test fixtures (positive/negative/ambiguous examples) live in `tests/fixtures/animex-links.ts`; nothing imports them at runtime.

## Services

`src/services/animex/client.ts`, `src/services/animex/user/favorites.ts`, `src/services/jena/client.ts` are empty placeholders.
