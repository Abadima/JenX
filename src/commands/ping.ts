import { SlashCommandBuilder } from "discord.js";

export const pingCommand = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  async execute(interaction: { reply: (payload: { content: string }) => Promise<unknown> }) {
    await interaction.reply({ content: "Pong!" });
  },
};
