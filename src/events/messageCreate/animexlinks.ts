import { EmbedBuilder } from "discord.js";
import { Logena } from "logena";

import {
    ANIMEX_LINKS_CONFIG,
    SECTION_KEYS,
    type SectionKey,
} from "../../features/message-assistant/config.js";
import { matchAnimeXLinks } from "../../features/message-assistant/matcher.js";
import { ChannelCooldown } from "../../features/message-assistant/cooldown.js";

/** Helper module: loaded by ./index.ts, not registered as its own listener. */
export const event = false;

/** The parts of a Discord message this handler uses, so it can be tested without a client. */
export interface LinkRequestMessage {
    content: string;
    channelId: string;
    author: { id: string; tag: string };
    reply(options: { embeds: EmbedBuilder[] }): Promise<unknown>;
}

const cooldown = new ChannelCooldown(ANIMEX_LINKS_CONFIG.cooldownMs);

function buildEmbed(
    section: SectionKey | undefined,
    confidence: number,
    matchMs: number,
): EmbedBuilder {
    const { sections, response } = ANIMEX_LINKS_CONFIG;
    const ordered = section
        ? [section, ...SECTION_KEYS.filter((key) => key !== section)]
        : SECTION_KEYS;

    const links = ordered.map((key) => {
        const { label, url } = sections[key];
        const text = `[${label}](${url})`;

        return key === section ? `**${text}**` : text;
    });

    return new EmbedBuilder()
        .setTitle(response.title)
        .setDescription(response.description)
        .setColor(response.color)
        .setThumbnail(response.thumbnail)
        .setFooter({
            text: `${confidence}% Confidence | ${matchMs.toFixed(2)}ms`,
        })
        .addFields({ name: "Links", value: links.join("\n") });
}

export async function handleAnimeXLinks(
    message: LinkRequestMessage,
): Promise<boolean> {
    const startedAt = performance.now();
    const result = matchAnimeXLinks(message.content);
    const matchMs = Math.max(0, performance.now() - startedAt);

    if (!result.matched) return false;
    if (!cooldown.claim(message.channelId, Date.now())) return false;

    try {
        await message.reply({
            embeds: [buildEmbed(result.section, result.confidence, matchMs)],
        });
    } catch (error) {
        cooldown.release(message.channelId);
        throw error;
    }

    cooldown.confirm(message.channelId, Date.now());

    Logena.debug(
        `Sent AnimeX links in ${message.channelId} (confidence ${result.confidence}, ${matchMs.toFixed(2)}ms, section ${result.section ?? "general"})`,
    );

    return true;
}
