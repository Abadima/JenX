import { config } from "dotenv";

config();

export const env = {
  discordToken: process.env.DISCORD_TOKEN,
  discordClientId: process.env.DISCORD_CLIENT_ID,
  guildId: process.env.DISCORD_GUILD_ID,
};
