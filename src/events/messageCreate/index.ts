import type { ClientEvents, Message } from "discord.js";

import { handleAnimeXLinks } from "./animexlinks.js";

export const name = "messageCreate" as keyof ClientEvents;
export const once = false;

/**
 * Event-level orchestration. Errors are logged by the kernel's listener
 * wrapper, so handlers here are allowed to throw.
 */
export async function execute(message: Message): Promise<void> {
    if (message.author.bot || message.webhookId) return;

    await handleAnimeXLinks(message);
}
