import { createBotClient } from "./bot/client.js";
import { env } from "./config/env.js";

const start = async (): Promise<void> => {
  if (!env.discordToken) {
    console.error("Missing DISCORD_TOKEN in environment.");
    process.exitCode = 1;
    return;
  }

  const client = createBotClient();
  await client.login(env.discordToken);
};

void start();
