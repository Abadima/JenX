import type { Interaction } from "discord.js";
import { Logena } from "logena";

import { getCommand } from "../../kernel/registry.js";

export const name = "interactionCreate";
export const once = false;

export async function execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = getCommand(interaction.commandName);

    // More robust validation for commands
    if (!command) {
        Logena.warn(`Unknown command: ${interaction.commandName}`);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "This command is no longer available.",
                ephemeral: true,
            });
        }
        return;
    }

    // Check that the command has a chatInput handler
    if (!command.chatInput) {
        Logena.warn(`Command ${interaction.commandName} missing chat input handler`);
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "This command is no longer available.",
                ephemeral: true,
            });
        }
        return;
    }

    await command.chatInput.execute(interaction);
}
