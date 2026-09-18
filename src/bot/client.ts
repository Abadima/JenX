import { Client, GatewayIntentBits } from "discord.js";

import { onReady } from "../events/ready.js";

export const createBotClient = (): Client => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once("ready", () => onReady(client));

  return client;
};
