import type { ChatInputCommandInteraction } from "discord.js";
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import { command } from "./index.js";

export const data = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

export async function execute(
    interaction: ChatInputCommandInteraction,
): Promise<void> {
    const startTime = performance.now();

    await interaction.reply({
        content: "Pinging...",
    });

    const responseLatency = performance.now() - startTime;
    const gatewayLatency = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
        .setTitle("Pong!")
        .setDescription([
            `**Gateway:** \`${gatewayLatency}ms\``,
            `**Response:** \`${responseLatency.toFixed(2)}ms\``,
        ].join("\n"));

    await interaction.editReply({
        content: null,
        embeds: [embed],
    });
}