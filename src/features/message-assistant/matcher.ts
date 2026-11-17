import {
    ANIMEX_LINKS_CONFIG,
    SECTION_KEYS,
    type SectionKey,
} from "./config.js";

/**
 * Deterministic matcher for the AnimeX link assistant.
 *
 * Confidence is a heuristic score in points out of 100, built from independent
 * evidence classes (topic, request intent, explicit name, section). It is not a
 * calibrated probability: the number states how much evidence matched, nothing
 * about the odds that the author wanted a link.
 */

export interface MatchResult {
    /** Heuristic confidence in points, 0-100. */
    confidence: number;
    matched: boolean;
    section?: SectionKey;
}

const CONFIG = ANIMEX_LINKS_CONFIG;

/** Topic words: configured keywords plus every section trigger word. */
const TOPIC_WORDS = new Set<string>(CONFIG.keywords);
const TOPIC_PHRASES: string[] = [];
const NAME_WORDS = new Set<string>();
const NAME_PHRASES: string[] = [];
const SECTION_BY_WORD = new Map<string, SectionKey>();

for (const keyword of CONFIG.keywords) {
    if (keyword.includes(" ")) {
        TOPIC_PHRASES.push(` ${keyword} `);
        TOPIC_WORDS.delete(keyword);
    }
}

for (const name of CONFIG.names) {
    if (name.includes(" ")) {
        NAME_PHRASES.push(` ${name} `);
    } else {
        NAME_WORDS.add(name);
    }
}

for (const key of SECTION_KEYS) {
    for (const word of CONFIG.sections[key].keywords) {
        SECTION_BY_WORD.set(word, key);
        TOPIC_WORDS.add(word);
    }
}

/** Lowercase, drop apostrophes, collapse 3+ identical letters, punctuation to spaces. */
export function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/([a-z0-9])\1{2,}/g, "$1")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function singularize(word: string): string {
    return word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word;
}

/** Normalized text with every word reduced to singular, so one form matches all. */
function canonicalize(text: string): string {
    return normalize(text).split(" ").map(singularize).join(" ");
}

interface Classification {
    topic: boolean;
    name: boolean;
    section?: SectionKey;
}

function classify(text: string): Classification {
    const padded = ` ${text} `;

    let topic = TOPIC_PHRASES.some((phrase) => padded.includes(phrase));
    let name = NAME_PHRASES.some((phrase) => padded.includes(phrase));
    let section: SectionKey | undefined;

    for (const word of text.split(" ")) {
        if (!topic && TOPIC_WORDS.has(word)) topic = true;
        if (!name && NAME_WORDS.has(word)) name = true;
        if (!section) section = SECTION_BY_WORD.get(word);
        if (topic && name && section) break;
    }

    return section ? { topic, name, section } : { topic, name };
}

export function matchAnimeXLinks(text: string): MatchResult {
    if (!CONFIG.enabled) return { matched: false, confidence: 0 };

    const canonical = canonicalize(text);

    if (canonical.length === 0) return { matched: false, confidence: 0 };

    if (CONFIG.negativePatterns.some((pattern) => pattern.test(canonical))) {
        return { matched: false, confidence: 0 };
    }

    const intent = CONFIG.patterns.some((pattern) => pattern.test(canonical));
    const { topic, name, section } = classify(canonical);

    let confidence = 0;

    if (topic) confidence += CONFIG.weights.topic;
    if (intent) confidence += CONFIG.weights.intent;
    if (name) confidence += CONFIG.weights.name;
    if (section) confidence += CONFIG.weights.section;

    confidence = Math.min(confidence, 100);

    const matched = confidence >= CONFIG.threshold;

    return section ? { matched, confidence, section } : { matched, confidence };
}
