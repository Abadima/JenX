/**
 * AnimeX link assistant configuration.
 *
 * The only place that knows what the assistant reacts to and what it answers.
 * `matcher.ts` scores these values and has no message-specific rules.
 *
 * Patterns run against canonical text: lowercase, apostrophes removed, runs of
 * 3+ identical letters collapsed, punctuation turned into spaces, plurals
 * reduced to singular. Write patterns accordingly and never use the `g` flag
 * (stateful `lastIndex` makes matching flaky).
 */

export type SectionKey = "homepage" | "catalog" | "schedule" | "community";

export interface AnimeXSection {
    label: string;
    url: string;
    /** Singular trigger words; these are also topic words. */
    keywords: readonly string[];
}

export interface AnimeXLinksConfig {
    enabled: boolean;
    /** Per-channel cooldown after a successful reply. */
    cooldownMs: number;
    /** Minimum confidence in points, out of 100. */
    threshold: number;
    /**
     * Evidence points out of 100. Topic + intent = 80 = threshold: a site
     * mention with a request shape is the minimum evidence to reply. Naming
     * AnimeX or a section adds 10 each. This is a heuristic, not a probability.
     */
    weights: {
        topic: number;
        intent: number;
        name: number;
        section: number;
    };
    keywords: readonly string[];
    /** Spellings of the site name; also counted as a separate evidence class. */
    names: readonly string[];
    patterns: readonly RegExp[];
    /** Any match discards the message before scoring. */
    negativePatterns: readonly RegExp[];
    sections: Record<SectionKey, AnimeXSection>;
    /** Static embed content; the footer is generated per match. */
    response: {
        title: string;
        description: string;
        color: number;
        thumbnail: string;
    };
}

/** Accepted spellings and near-typos of the site name. */
const ANIMEX_NAMES = ["animex", "animx", "animexx", "anime x"] as const;

/** Nouns that can name a destination, alone or after the site name. */
const LINK_NOUNS = [
    "url",
    "link",
    "website",
    "site",
    "homepage",
    "page",
    "one",
] as const;

const SECTIONS: Record<SectionKey, AnimeXSection> = {
    homepage: {
        label: "Homepage",
        url: "https://animex.one",
        keywords: ["homepage", "home"],
    },
    catalog: {
        label: "Browse Catalog",
        url: "https://animex.one/catalog",
        keywords: ["catalog", "browse"],
    },
    schedule: {
        label: "Schedule",
        url: "https://animex.one/schedule",
        keywords: ["schedule", "airing"],
    },
    community: {
        label: "Community",
        url: "https://animex.one/community",
        keywords: ["community"],
    },
};

export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/** Adding a section makes its trigger words match and highlight automatically. */
const SECTION_WORDS = SECTION_KEYS.flatMap((key) => SECTIONS[key].keywords);

/** Anything a request can point at. */
const REFERENCE = [
    ...new Set<string>([...LINK_NOUNS, ...SECTION_WORDS, ...ANIMEX_NAMES]),
].join("|");

const REQUEST_VERBS =
    "send|share|drop|give|gimme|lemme|paste|dm|post|link|pass|hand|need|want|looking for|got|have";

const POLITE = "pls|plz|please";

/** Words that name the act of consuming anime; "find" is only a request verb. */
const MEDIA_WORDS = [
    "watch",
    "watching",
    "stream",
    "streaming",
    "browsing",
    "find",
] as const;

const SITE = "website|site";

/** Things that turn a site mention into hosting, design or outage talk. */
const SITE_TROUBLE =
    "builder|template|hosting|design|development|domain|registrar|down|broken|error|not working|work|blocked|blocker";

/** Asking for a good/best site is a recommendation request, not our link. */
const RECOMMENDATION =
    "best|good|great|recommend|recommendation|suggest|suggestion|alternative";

/** Their own project: "a link to my portfolio" is not an AnimeX request. */
const PERSONAL_PROJECTS =
    "portfolio|project|business|company|repo|repository|blog|store|shop|startup";

/** A link to one of these is not a link to AnimeX. */
const OTHER_SERVICES =
    "youtube|netflix|hulu|disney|prime video|crunchyroll|spotify|soundcloud|twitch|twitter|instagram|tiktok|facebook|reddit|github|steam|discord|myanimelist|anilist|imdb|wikipedia|google";

/** Questions may contain "I have"; statements may not. */
const QUESTION_START =
    "what|whats|where|wheres|which|how|can|could|would|do|does|did|is|are|anyone|anybody";

const STATEMENT_VERBS = "have|had|got|made|found|like|love|sent|saw|use";

export const ANIMEX_LINKS_CONFIG: AnimeXLinksConfig = {
    enabled: true,
    cooldownMs: 60_000,
    threshold: 80,
    weights: {
        topic: 40,
        intent: 40,
        name: 10,
        section: 10,
    },
    keywords: [
        ...ANIMEX_NAMES,
        "website",
        "site",
        "url",
        "link",
        ...MEDIA_WORDS.filter((word) => word !== "find"),
    ],
    names: ANIMEX_NAMES,
    patterns: [
        // "whats the animex link", "where's the schedule"
        new RegExp(
            String.raw`\b(?:what|whats|where|wheres|which|how)\b.*\b(?:${REFERENCE})\b`,
        ),
        // "can you send me the link", "could u share the url"
        new RegExp(
            String.raw`\b(?:can|could|would)\s+(?:you|u)\b.*\b(?:${REQUEST_VERBS})\b`,
        ),
        // "send animex website", "need the url", "gimme the animex link"
        new RegExp(
            String.raw`\b(?:${REQUEST_VERBS})\b.*\b(?:${REFERENCE})\b`,
        ),
        // "where do i watch anime", "how can i stream"
        new RegExp(
            String.raw`\b(?:where|what|how)\b.*\b(?:${MEDIA_WORDS.join("|")})\b`,
        ),
        // "catalog page", "community link"
        new RegExp(
            String.raw`\b(?:${SECTION_WORDS.join("|")})\s+(?:page|link|url)\b`,
        ),
        // "animex website pls"
        new RegExp(
            String.raw`\b(?:${REFERENCE})\s+(?:${POLITE})\b`,
        ),
        // "pls animex link"
        new RegExp(
            String.raw`\b(?:${POLITE})\s+(?:${REFERENCE})\b`,
        ),
        // "animex link" with no verb at all
        new RegExp(
            String.raw`^(?:the |that |your |a )?(?:${ANIMEX_NAMES.join("|")})(?: (?:${LINK_NOUNS.join("|")}))?$`,
        ),
    ],
    negativePatterns: [
        // Building or running your own site.
        new RegExp(
            String.raw`\b(?:built|building|make|making|made|design|designing|develop|developing|create|creating|host|hosting)\b.*\b(?:${SITE}|domain)\b`,
        ),
        // Site building/hosting talk and outages.
        new RegExp(
            String.raw`\b(?:${SITE})\b.*\b(?:${SITE_TROUBLE})\b`,
        ),
        // "need a website for my portfolio".
        new RegExp(
            String.raw`\b(?:${SITE})\s+for\s+(?:my|our|your)\b`,
        ),
        // Dislike of links or sites.
        new RegExp(String.raw`\bhate\b.*\b(?:${SITE}|url|link)\b`),
        // Personal scheduling, not the AnimeX schedule.
        /\b(?:my|our)\s+(?:schedule|calendar)\b/,
        // Broken link bug reports.
        /\b(?:broken|dead)\s+(?:link|url)\b/,
        // First-person possession or opinion, unless the message is a question.
        new RegExp(
            String.raw`^(?!(?:${QUESTION_START})\b)\b(?:i|we)\b.*\b(?:${STATEMENT_VERBS})\b.*\b(?:${REFERENCE})\b`,
        ),
        // First-person ownership: "where is my website".
        new RegExp(
            String.raw`\b(?:my|our)\s+(?:${LINK_NOUNS.join("|")}|${SECTION_WORDS.join("|")})\b`,
        ),
        // Definition questions: "what is a website".
        /\bwhat\s+(?:is|are)\s+(?:a|an)\s+(?:website|site)\b/,
        // Their own work: "i need a link to my portfolio".
        new RegExp(String.raw`\b(?:my|our)\s+(?:${PERSONAL_PROJECTS})\b`),
        // Recommendation requests: "what's a good anime site".
        new RegExp(
            String.raw`\b(?:${RECOMMENDATION})\b.*\b(?:${SITE})\b`,
        ),
        // Another service is the actual subject.
        new RegExp(String.raw`\b(?:${OTHER_SERVICES})\b`),
    ],
    sections: SECTIONS,
    response: {
        title: "👋 Hey there!",
        description: "Here's some links that might help.",
        color: 0xe0d8d0,
        thumbnail:
            "https://i.pinimg.com/564x/a9/f5/b5/a9f5b5aee5495e2b2169ff42079c9b28.jpg",
    },
};
