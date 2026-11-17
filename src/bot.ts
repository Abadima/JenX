import { ActivityType, Client, GatewayIntentBits } from "discord.js";
import { register } from "./kernel/register.js";
import { Logena } from "logena";
import "dotenv/config";

Logena.set({
    appName: "JenX",
    colors: {
        appName: "red",
    },
    useTimestamps: true,
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
    presence: {
        activities: [
            { name: "Watching Frieren on AnimeX", type: ActivityType.Watching },
        ],
        status: "online",
    },
});

client.once("clientReady", () => {
    void register(client).catch((error: unknown) => {
        Logena.error(
            `Registration failed: ${error instanceof Error ? error.message : String(error)}`,
        );

        process.exit(1);
    });
});

const token = process.env.DISCORD_TOKEN;

if (!token) {
    throw new Error("DISCORD_TOKEN is not set");
}

await client.login(token);
