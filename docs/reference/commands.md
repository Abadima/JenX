# Commands Reference

## Implemented Commands

### ping (utilities)

**Location:** `src/commands/utilities/ping/`

**Definition:** `src/commands/utilities/ping/index.ts`

```typescript
export const command = {
    name: "ping",
    description: "Check JenX's latency.",
    types: ["chatInput"]
} as const;
```

**Handler:** `src/commands/utilities/ping/chatInput.ts`

**Features:**
- Measures Discord gateway latency via `interaction.client.ws.ping`
- Measures response latency via `performance.now()`
- Returns results in an EmbedBuilder with formatted values

### h (fun)

**Location:** `src/commands/fun/h/`

**Definition:** `src/commands/fun/h/index.ts`

```typescript
export const command = {
    name: "h",
    description: "h",
    types: ["chatInput"]
} as const;
```

**Handler:** `src/commands/fun/h/chatInput.ts`

**Features:**
- Placeholder command
- Simply replies "h" to interaction
- No actual functionality yet

## Command Structure

### File Organization

```
src/commands/{category}/{command}/
├── index.ts          # Command definition (name, description, types)
├── chatInput.ts      # Slash command handler (data builder + execute)
├── userContext.ts    # Optional: User context menu handler
└── messageContext.ts # Optional: Message context menu handler
```

### Required Exports

**index.ts:**
```typescript
export const command = {
    name: string,
    description?: string,
    types: readonly ["chatInput" | "userContext" | "messageContext"]
} as const;
```

**chatInput.ts:**
```typescript
export const data = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    // Command logic
}
```

## Categories

### utilities
- `ping` - Latency checker

### fun
- `h` - Placeholder command

## Adding New Commands

See `guides/development.md` for detailed instructions on adding new commands.
