import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

import { command } from "./index.js";

export const data = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

export async function execute(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    await interaction.reply("h");
}