# Integrations Reference

## AnimeX API

### Status

**Current State:** Link assistant is implemented, service files being removed (empty placeholders)

**Note:** The `src/services/animex/` directory contains empty placeholder files that are being removed. The link assistant functionality remains active and is implemented in `src/features/message-assistant/`.

### Planned Features

Based on directory structure, AnimeX integration likely includes:

1. **Anime Search/Discovery**
   - Browse anime by genre, popularity, or search query

2. **User Favorites Management**
   - Add/remove anime to user's favorites
   - View favorite anime list
   - Get recommendations based on favorites

3. **Anime Metadata**
   - Anime details (title, synopsis, genres, episodes, ratings)
   - Cover art and thumbnails
   - Episode streaming links (if applicable)

### Link Assistant

The AnimeX link assistant is implemented in `src/features/message-assistant/` and provides automatic responses with relevant links. See `src/features/message-assistant/config.ts` for configuration.

## Jena API

### Status

**Current State:** Placeholder implementation (empty file being removed)

**Note:** The `src/services/jena/client.ts` file is an empty placeholder that will be removed. No Jena API integration is currently implemented.

### Planned Features

Based on environment variable and project description:

1. **Account Management**
   - Create/manage website accounts
   - Update account credentials

2. **Account Linking**
   - Link Discord account to website account
   - Verify link status
   - Manage multiple links

3. **Website Integration**
   - Admin functionality for moderators
   - User account operations
   - Permission-based access

### Implementation Pattern

Services should follow this pattern:

```typescript
// src/services/jena/client.ts
class JenaClient {
    constructor(apiKey: string) {
        // Initialize HTTP client
    }

    async linkAccount(userId: string, websiteAccountId: string): Promise<void>
    async unlinkAccount(userId: string, websiteAccountId: string): Promise<void>
    async getLinkedAccounts(userId: string): Promise<Link[]>
    async createAccount(data: CreateAccountData): Promise<Account>
    async updateAccount(accountId: string, data: UpdateAccountData): Promise<Account>
    async deleteAccount(accountId: string): Promise<void>
    async getAccount(accountId: string): Promise<Account>
}

export const jenaClient = new JenaClient(process.env.JENA_API_KEY);
```

### Usage Example (Future)

```typescript
export async function execute(interaction: ChatInputCommandInteraction) {
    const websiteAccountId = interaction.options.getString("account");
    await jenaClient.linkAccount(interaction.user.id, websiteAccountId);
    await interaction.reply("Account linked successfully!");
}
```

## Discord Integration

### Current Discord Features

**Intents** (`src/bot.ts`):
```typescript
GatewayIntentBits.Guilds
GatewayIntentBits.GuildMessages     // required for messageCreate
GatewayIntentBits.MessageContent    // privileged; enable in Developer Portal
```

**Presence:**
```typescript
activities: [{ name: "Watching Frieren on AnimeX", type: ActivityType.Watching }]
status: "online"
```

### Discord Commands

See `reference/commands.md`.

### Discord Events

Loaded dynamically from `src/events/`:
- `interactionCreate` (`commands.ts`) - command dispatch
- `messageCreate` (`index.ts`) - message orchestration, dispatches to `animexlinks.ts`

## External APIs

### Required Configuration

**AnimeX API** (to be added):
```
ANIMEX_API_KEY=your_animex_api_key
```

**Jena API** (placeholder, to be added):
```
JENA_API_KEY=your_jena_api_key
```

### API Client Best Practices

1. **Error Handling:** Catch and log API errors, reply to users gracefully
2. **Rate Limiting:** Implement request throttling if needed
3. **Caching:** Cache API responses to reduce requests
4. **Type Safety:** Define TypeScript interfaces for API responses
5. **Environment:** Never hardcode API keys, use environment variables
