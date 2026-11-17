# Architecture Overview

## Structure

```
src/
├── bot.ts                        # Client, intents, login
├── kernel/                       # loader + registry
│   ├── types.ts                  # LoadedCommand / LoadedEvent
│   ├── load.ts                   # discovers commands and events
│   ├── loadFiles.ts              # filesystem helpers
│   ├── register.ts               # wires client listeners + application commands
│   └── registry.ts               # in-memory command map
├── commands/{category}/{command}/ # index.ts + chatInput.ts
├── events/
│   ├── interactionCreate/
│   │   └── commands.ts           # slash-command dispatch
│   └── messageCreate/
│       ├── index.ts              # orchestration: filters + dispatch
│       └── animexlinks.ts        # AnimeX link assistant (helper module)
├── features/message-assistant/   # config.ts, matcher.ts
└── services/                     # external API placeholders
```

## Systems

1. **Kernel** - scans `src/commands` and `src/events` and registers everything at `clientReady`; no manual registration.
2. **Commands** - folder definition plus a per-type handler (`chatInput`, `userContext`, `messageContext`).
3. **Events** - every file in `src/events/` is either a listener (`name`, `once`, `execute`) or a helper module (`event = false`) imported by a sibling `index.ts`.
4. **Message assistant** - pure feature layer (config + deterministic matcher) consumed by `events/messageCreate/animexlinks.ts`, which owns cooldown and the Discord embed.

## Execution flow

```
login -> clientReady -> register()
  loadCommands() + loadEvents()
  setCommands(registry)
  client.on/once per event
  application.commands.set()

messageCreate -> index.ts filters bots/webhooks
  -> animexlinks.ts -> matchAnimeXLinks() (rejects empty/irrelevant)
  -> cooldown -> EmbedBuilder reply
```
