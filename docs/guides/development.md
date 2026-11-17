# Development Guide

## Adding a command

1. `src/commands/{category}/{command}/index.ts`:

```typescript
export const command = {
    name: "my-command",
    description: "Command description",
    types: ["chatInput"],
} as const;
```

2. `src/commands/{category}/{command}/chatInput.ts`:

```typescript
import { SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import { command } from "./index.js";

export const data = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

export async function execute(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    await interaction.reply("ok");
}
```

## Adding an event

1. `src/events/{eventName}/index.ts`:

```typescript
import type { ClientEvents } from "discord.js";

export const name = "ready" as keyof ClientEvents;
export const once = true;

export async function execute(...args: ClientEvents["ready"]): Promise<void> {
    // ...
}
```

Every file in `src/events/` is imported. Files that share an event name become independent listeners, so keep message handling in `messageCreate/index.ts` and add behaviour modules instead:

```typescript
// src/events/messageCreate/other-handler.ts
export const event = false; // helper module, not a listener

export async function handleOther(message: Message): Promise<void> {
    // ...
}
```

Then call it from `src/events/messageCreate/index.ts`. Keep the orchestrator thin: shared filters and dispatch only.

## Changing the link assistant

- Triggers, aliases, patterns, negative patterns, weights, threshold, sections and embed copy: `src/features/message-assistant/config.ts`.
- Matching engine (generic, config-driven): `src/features/message-assistant/matcher.ts`.
- Evaluation examples: `tests/fixtures/animex-links.ts` - add examples there, then run tests.

## Tests

Tests live in `tests/` as TypeScript and use `node:test` + `node:assert/strict`, which both Bun and Node execute. Never import `bun:test`; one suite must stay valid for both runtimes.

`tsconfig.test.json` typechecks `src/` and `tests/` together and emits JavaScript to `.test-build/` (ignored) so `node --test` can run the same suite.

## Verify

```bash
bun run build     # tsc + oxlint --fix
bun run typecheck # src + tests
bun run test      # typecheck, then Bun and Node runners
bun run test:node # genuine Node execution (node --test)
```
