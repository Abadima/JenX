import {
    ANIMEX_LINKS_CONFIG,
    SECTION_KEYS,
    type SectionKey,
} from "./config.js";
import { isPlausibleTypo } from "./typo.js";

/**
 * Deterministic matcher for the AnimeX link assistant.
 *
 * Confidence is a heuristic score out of 100, not a calibrated probability.
 * A request is one clause; typos are repaired in a second pass that only runs
 * when no frame matches the message as typed.
 */

export interface MatchResult {
    /** Heuristic confidence in points, 0-100. */
    confidence: number;
    matched: boolean;
    section?: SectionKey;
}

const CONFIG = ANIMEX_LINKS_CONFIG;

/** Strong topic words only; section words are tracked separately as sections. */
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
    }
}

const SINGULAR = new Map<string, string>(
    CONFIG.pluralNouns.map((noun) => [`${noun}s`, noun]),
);
const CLAUSE_BREAKERS = new Set<string>(CONFIG.clauseBreakers);

/** Mentions, custom emoji and URLs: posting "animex.one" gives a link, it does not ask for one. */
const NOISE =
    /<(?:@[!&]?|#)\d+>|<a?:\w+:\d+>|https?:\/\/\S+|www\.\S+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:one|com|net|org|io|gg|tv|app|dev|xyz|cc)\b(?:\/\S*)?/gi;

/** "animex's link" is "animex link". */
const POSSESSIVE = new RegExp(
    `\\b(${CONFIG.names.filter((name) => !name.includes(" ")).join("|")})['’]s\\b`,
    "gi",
);

const CLAUSE_PUNCTUATION = /[.!?;,:\n\r]+|\s[-–—]+\s|[–—]+/;

/** Lowercase, drop apostrophes, collapse 3+ identical letters, punctuation to spaces. */
export function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/([a-z0-9])\1{2,}/g, "$1")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

interface Prepared {
    clauses: string[];
    flat: string;
    words: number;
}

function prepare(text: string): Prepared {
    const clauses: string[] = [];
    const words: string[] = [];

    const cleaned = text.replace(NOISE, " ").replace(POSSESSIVE, "$1");

    for (const segment of cleaned.split(CLAUSE_PUNCTUATION)) {
        let clause: string[] = [];

        for (const token of normalize(segment).split(" ")) {
            if (token === "") continue;

            const word = SINGULAR.get(token) ?? token;

            words.push(word);

            if (CLAUSE_BREAKERS.has(word)) {
                if (clause.length > 0) clauses.push(clause.join(" "));
                clause = [];
            } else {
                clause.push(word);
            }
        }

        if (clause.length > 0) clauses.push(clause.join(" "));
    }

    return { clauses, flat: words.join(" "), words: words.length };
}

interface Evidence {
    topic: boolean;
    section?: SectionKey;
}

function gather(text: string): Evidence {
    const padded = ` ${text} `;

    let topic =
        TOPIC_PHRASES.some((phrase) => padded.includes(phrase)) ||
        CONFIG.topicPatterns.some((pattern) => pattern.test(text));
    let section: SectionKey | undefined;

    for (const word of text.split(" ")) {
        if (!topic && TOPIC_WORDS.has(word)) topic = true;
        if (!section) section = SECTION_BY_WORD.get(word);
        if (topic && section) break;
    }

    return section ? { topic, section } : { topic };
}

function hasName(text: string): boolean {
    const padded = ` ${text} `;

    return (
        NAME_PHRASES.some((phrase) => padded.includes(phrase)) ||
        text.split(" ").some((word) => NAME_WORDS.has(word))
    );
}

function lengthPenalty(words: number): number {
    const { freeWords, penaltyPerWord } = CONFIG.length;

    return Math.max(0, words - freeWords) * penaltyPerWord;
}

function doubtPenalty(text: string): number {
    let penalty = 0;

    for (const doubt of CONFIG.doubts) {
        if (doubt.pattern.test(text)) penalty += doubt.penalty;
    }

    return penalty;
}

const TYPOS = CONFIG.typos;
const TYPO_TARGETS = [...new Set(TYPOS.targets)];
const ALREADY_RIGHT = new Set<string>([...TYPOS.known, ...TYPO_TARGETS]);
const GUARD = new Set<string>(TYPOS.guard);
const SHORTHAND = new Map<string, string>(Object.entries(TYPOS.shorthand));
const SEGMENT_WORDS = new Set<string>(TYPOS.segments);

/** Grammar words with two letters swapped ("teh", "cna"); a swap two words share is dropped. */
const SWAPPED = new Map<string, string | null>();

for (const word of ALREADY_RIGHT) {
    if (word.length < 3) continue;

    for (let index = 0; index < word.length - 1; index++) {
        if (word[index] === word[index + 1]) continue;

        const swapped =
            word.slice(0, index) +
            word[index + 1] +
            word[index] +
            word.slice(index + 2);

        if (ALREADY_RIGHT.has(swapped)) continue;

        SWAPPED.set(swapped, SWAPPED.has(swapped) ? null : word);
    }
}

/** Targets `token` could be a finger slip of; "where" and "wheres" count as one. */
function nearTargets(token: string, ignoreGuard: boolean): string[] {
    if (token.length < 4 || ALREADY_RIGHT.has(token)) return [];
    if (!ignoreGuard && GUARD.has(token)) return [];

    const found: string[] = [];

    for (const target of TYPO_TARGETS) {
        if (!isPlausibleTypo(token, target)) continue;

        const twin = found.findIndex(
            (word) => `${word}s` === target || `${target}s` === word,
        );

        if (twin === -1) {
            found.push(target);
        } else if (target.length < found[twin]!.length) {
            found[twin] = target;
        }
    }

    return found;
}

/** Words `token` may have been meant to be; for an ambiguous slip ("wnat") the frames decide. */
export function repairOptions(token: string, ignoreGuard = false): string[] {
    const shorthand = SHORTHAND.get(token);

    if (shorthand !== undefined) return [shorthand];
    if (token.length < 3 || ALREADY_RIGHT.has(token)) return [];
    if (!ignoreGuard && GUARD.has(token)) return [];

    const options = new Set<string>(nearTargets(token, ignoreGuard));
    const swapped = SWAPPED.get(token);

    if (swapped) options.add(swapped);

    return [...options];
}

interface Cut {
    fixes: number;
    words: string[];
}

/** Cuts a run-together token ("wjatisthesite") into 3+ frame words, one misspelt at most. */
function segment(token: string): Cut | undefined {
    if (token.length < 8 || token.length > 28) return undefined;

    const cuts: (Cut | undefined)[] = Array.from(
        { length: token.length + 1 },
        () => undefined,
    );

    cuts[0] = { fixes: 0, words: [] };

    for (let end = 2; end <= token.length; end++) {
        for (let start = Math.max(0, end - 12); start <= end - 2; start++) {
            const before = cuts[start];

            if (!before) continue;

            const piece = token.slice(start, end);
            const exact = SEGMENT_WORDS.has(piece);
            const near = exact ? [] : nearTargets(piece, false);
            const word = exact ? piece : near.length === 1 ? near[0] : undefined;

            if (word === undefined) continue;

            const candidate: Cut = {
                fixes: before.fixes + (exact ? 0 : 1),
                words: [...before.words, word],
            };
            const current = cuts[end];

            if (
                !current ||
                candidate.fixes < current.fixes ||
                (candidate.fixes === current.fixes &&
                    candidate.words.length < current.words.length)
            ) {
                cuts[end] = candidate;
            }
        }
    }

    const result = cuts[token.length];

    return result && result.words.length >= 3 && result.fixes <= 1
        ? result
        : undefined;
}

interface Repaired {
    text: string;
    /** Repairs made at each word, so a match is charged only for its own. */
    fixAt: number[];
}

interface Partial {
    words: string[];
    fixAt: number[];
    fixes: number;
}

const MAX_READINGS = 8;

function readingsOf(token: string): Partial[] {
    const options = repairOptions(token);

    if (options.length > 0) {
        return options.map((word) => ({ words: [word], fixAt: [1], fixes: 1 }));
    }

    const cut =
        ALREADY_RIGHT.has(token) || GUARD.has(token) ? undefined : segment(token);

    if (cut) {
        return [
            {
                words: cut.words,
                fixAt: cut.words.map((_, index) => (index === 0 ? 1 + cut.fixes : 0)),
                fixes: 1 + cut.fixes,
            },
        ];
    }

    return [{ words: [token], fixAt: [0], fixes: 0 }];
}

function repairClause(clause: string): Repaired[] {
    let partials: Partial[] = [{ words: [], fixAt: [], fixes: 0 }];

    for (const token of clause.split(" ")) {
        const next: Partial[] = [];

        for (const partial of partials) {
            for (const reading of readingsOf(token)) {
                const fixes = partial.fixes + reading.fixes;

                if (fixes > TYPOS.maxFixes) continue;

                next.push({
                    words: [...partial.words, ...reading.words],
                    fixAt: [...partial.fixAt, ...reading.fixAt],
                    fixes,
                });
            }
        }

        if (next.length === 0 || next.length > MAX_READINGS) return [];

        partials = next;
    }

    return partials
        .filter((partial) => partial.fixes > 0)
        .map((partial) => ({ text: partial.words.join(" "), fixAt: partial.fixAt }));
}

interface Reading {
    evidence: Evidence;
    points: number;
    fixes: number;
}

/** Reads a clause as a request; `fixAt` charges only repairs inside the matched words. */
function readClause(
    text: string,
    fixAt?: readonly number[],
): Reading | undefined {
    if (CONFIG.clauseVetoes.some((pattern) => pattern.test(text))) {
        return undefined;
    }

    let fixes: number | undefined;

    for (const pattern of CONFIG.patterns) {
        const found = pattern.exec(text);

        if (!found) continue;

        let cost = 0;

        if (fixAt) {
            const used = found[0].split(" ").length;

            for (let index = 0; index < used; index++) cost += fixAt[index] ?? 0;
        }

        if (fixes === undefined || cost < fixes) fixes = cost;
    }

    if (fixes === undefined) return undefined;

    const evidence = gather(text);
    const points =
        (evidence.topic ? CONFIG.weights.topic : 0) +
        (evidence.section ? CONFIG.weights.section : 0);

    return { evidence, points, fixes };
}

export function matchAnimeXLinks(text: string): MatchResult {
    if (!CONFIG.enabled) return { matched: false, confidence: 0 };

    const { clauses, flat, words } = prepare(text);

    if (flat.length === 0) return { matched: false, confidence: 0 };

    if (words > CONFIG.length.maxWords) return { matched: false, confidence: 0 };

    if (CONFIG.negativePatterns.some((pattern) => pattern.test(flat))) {
        return { matched: false, confidence: 0 };
    }

    let best: Reading | undefined;
    let repairedText: string | undefined;

    for (const clause of clauses) {
        const reading = readClause(clause);

        if (reading && (!best || reading.points > best.points)) best = reading;
    }

    // Nothing matched as typed: retry with typos repaired, vetoes included.
    if (!best) {
        for (const clause of clauses) {
            for (const repaired of repairClause(clause)) {
                if (CONFIG.negativePatterns.some((p) => p.test(repaired.text))) continue;

                const reading = readClause(repaired.text, repaired.fixAt);

                if (
                    reading &&
                    (!best ||
                        reading.points > best.points ||
                        (reading.points === best.points && reading.fixes < best.fixes))
                ) {
                    best = reading;
                    repairedText = repaired.text;
                }
            }
        }
    }

    // No frame: the whole message gives a partial score below the threshold.
    const intent = best !== undefined;
    const { topic, section } = best?.evidence ?? gather(flat);

    let confidence = 0;

    if (topic) confidence += CONFIG.weights.topic;
    if (intent) confidence += CONFIG.weights.intent;
    if (hasName(flat) || (repairedText !== undefined && hasName(repairedText))) {
        confidence += CONFIG.weights.name;
    }
    if (section) confidence += CONFIG.weights.section;

    const doubts = Math.max(
        doubtPenalty(flat),
        repairedText === undefined ? 0 : doubtPenalty(repairedText),
    );

    confidence = Math.max(
        0,
        Math.min(confidence, 100) -
            lengthPenalty(words) -
            doubts -
            (best?.fixes ?? 0) * TYPOS.penalty,
    );

    const matched = intent && confidence >= CONFIG.threshold;

    return section ? { matched, confidence, section } : { matched, confidence };
}
