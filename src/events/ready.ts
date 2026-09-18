import type { Client } from "discord.js";

export const onReady = (client: Client): void => {
  console.log(`✅ Logged in as ${client.user?.tag ?? "unknown"}`);
};
