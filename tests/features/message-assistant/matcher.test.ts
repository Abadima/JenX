import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ANIMEX_LINKS_CONFIG } from "../../../src/features/message-assistant/config.js";
import {
    matchAnimeXLinks,
    repairOptions,
} from "../../../src/features/message-assistant/matcher.js";
import { isPlausibleTypo } from "../../../src/features/message-assistant/typo.js";
import {
    AMBIGUOUS_EXAMPLES,
    NEGATIVE_EXAMPLES,
    POSITIVE_EXAMPLES,
} from "../../fixtures/animex-links.js";

const { threshold, length, weights, typos } = ANIMEX_LINKS_CONFIG;
const bare = weights.topic + weights.intent;
const run = matchAnimeXLinks;
const reply = (text: string) => run(text).matched;
const padTo = (base: string, total: number) =>
    base + " thanks".repeat(Math.max(0, total - base.split(" ").length));

describe("examples", () => {
    for (const text of POSITIVE_EXAMPLES) {
        it(`replies: ${text}`, () => assert.equal(reply(text), true));
    }

    for (const text of [...NEGATIVE_EXAMPLES, ...AMBIGUOUS_EXAMPLES]) {
        it(`silent: ${text.slice(0, 70)}`, () => assert.equal(reply(text), false));
    }
});

describe("configuration", () => {
    it("lets a bare request pass but no single signal", () => {
        assert.ok(bare >= threshold);
        assert.ok(weights.topic < threshold && weights.intent < threshold);
        assert.equal(run("send me the link").confidence, bare);
    });

    it("keeps the word cap where scoring can still say yes", () => {
        assert.ok(
            length.maxWords <=
                length.freeWords + (100 - threshold) / length.penaltyPerWord,
        );
    });

    it("keeps the typo lists consistent", () => {
        for (const target of typos.targets) {
            assert.ok(typos.segments.includes(target), target);
        }

        for (const word of typos.guard) {
            assert.deepEqual(repairOptions(word), [], word);
            assert.notEqual(repairOptions(word, true).length, 0, `stale: ${word}`);
        }
    });
});

describe("request frames", () => {
    it("do not depend on how many words sit between 'have' and 'animex'", () => {
        for (let gap = 0; gap <= 12; gap++) {
            const filler = Array.from({ length: gap }, (_, i) => `w${i}`).join(" ");

            assert.equal(reply(`id have ${filler} animex`), false, `gap ${gap}`);
            assert.equal(reply(`where id have to ${filler} use animex`), false, `gap ${gap}`);
        }
    });

    it("allow function words but not content words between ask and destination", () => {
        assert.equal(reply("can you send me the new official animex link"), true);
        assert.equal(reply("send the weird broken looking animex link"), false);
    });

    it("read 'have' as a request only when someone is asked", () => {
        for (const [text, expected] of [
            ["do i have the link", false],
            ["i have the link", false],
            ["can i have the link", true],
            ["does anyone have the link", true],
        ] as const) {
            assert.equal(reply(text), expected, text);
        }
    });

    it("start at the beginning of a clause; punctuation and conjunctions end one", () => {
        assert.equal(reply("my friend asked me where the link was"), false);
        assert.equal(reply("im new here, saw animex mentioned, whats the link"), true);
        assert.equal(reply("sorry if this was asked already but whats the link"), true);
        assert.equal(reply("can you send me the notes. the link is in the pins"), false);
    });

    it("take topic and section from the request's own clause", () => {
        assert.ok(run("whats the schedule").confidence < threshold);
        assert.equal(run("whats the animex schedule").section, "schedule");
        assert.equal(run("catalog page").section, "catalog");
        assert.equal(run("whats the animex link when you get home").section, undefined);
    });

    it("disqualify only the clause that holds a first-person statement", () => {
        assert.equal(reply("ive got the link"), false);
        assert.equal(reply("i got the old link, whats the new link"), true);
        assert.equal(reply("whats the link i have the old one"), true);
    });

    it("ignore mentions and URLs, and fold possessives and plurals", () => {
        assert.equal(reply("<@!123456789012345678> <#123456789> whats the link"), true);
        assert.equal(reply("<:wave:123456789012345678> whats the link"), true);
        assert.equal(reply("https://animex.one/catalog"), false);
        assert.equal(reply("whats animex's link"), true);
        assert.equal(reply("send me the links"), true);
    });

    it("cost points for doubts instead of vetoing", () => {
        const plain = run("can you send me the link");
        const other = run("can you send me the link to the zoom call");

        assert.equal(other.matched, false);
        assert.ok(other.confidence > 0 && other.confidence < plain.confidence);
        assert.equal(reply("can you send me the link to the catalog"), true);
    });
});

describe("message length", () => {
    const full = "can you send me the animex schedule link"; // 100 points
    const limit = length.freeWords + Math.floor((bare - threshold) / length.penaltyPerWord);

    it("ignores messages over the cap, however strong the request", () => {
        assert.equal(run(`${"blah ".repeat(length.maxWords)}${full}`).confidence, 0);
        assert.equal(reply(padTo(full, length.maxWords + 1)), false);
    });

    it("charges for each word past the free allowance", () => {
        const over = Math.max(0, length.maxWords - length.freeWords);
        const expected = 100 - over * length.penaltyPerWord;
        const result = run(padTo(full, length.maxWords));

        assert.equal(result.confidence, expected);
        assert.equal(result.matched, expected >= threshold);
    });

    it("needs more evidence as a message gets longer", () => {
        assert.equal(reply(padTo("send me the link", Math.min(limit, length.maxWords))), true);
        assert.equal(reply(padTo("send me the link", limit + 1)), false);
    });
});

describe("typos", () => {
    it("accepts only a slip of the fingers", () => {
        for (const [typed, intended] of [
            ["wjat", "what"], ["linl", "link"], ["lnik", "link"], ["lik", "link"],
            ["linkk", "link"], ["an8ime", "anime"], ["animec", "animex"],
        ] as const) {
            assert.equal(isPlausibleTypo(typed, intended), true, typed);
        }

        for (const [typed, intended] of [
            ["mhat", "what"], ["zhat", "what"], ["that", "what"], ["line", "link"],
        ] as const) {
            assert.equal(isPlausibleTypo(typed, intended), false, typed);
        }
    });

    it("repairs a word into a key word", () => {
        for (const [typed, intended] of [
            ["wjat", "what"], ["wehre", "where"], ["linl", "link"], ["wesite", "website"],
            ["wacth", "watch"], ["sned", "send"], ["animec", "animex"], ["wheree", "where"],
            ["te", "the"], ["teh", "the"], ["cna", "can"], ["yuo", "you"],
        ] as const) {
            assert.deepEqual(repairOptions(typed), [intended], typed);
        }
    });

    it("leaves real words and non-slips alone", () => {
        for (const word of [
            "that", "there", "here", "line", "lina", "side", "size", "match", "catch",
            "steam", "sent", "gave", "chat", "hats", "much", "nicer", "mhat", "ink",
        ]) {
            assert.deepEqual(repairOptions(word), [], word);
        }
    });

    it("lets the request settle an ambiguous slip", () => {
        assert.deepEqual(repairOptions("wnat").sort(), ["want", "what"]);
        assert.equal(reply("hey wnat the link"), true);
        assert.equal(reply("wnat to go home"), false);
    });

    it("charges only for repairs the matched request relies on", () => {
        assert.equal(run("whats the link").confidence, bare);
        assert.equal(run("wjat is the site").confidence, bare - typos.penalty);
        assert.equal(run("wjat was te site").confidence, bare - 2 * typos.penalty);
        // "an8ime" sits in the tail the request does not use.
        assert.equal(run("wat the link to watch an8ime").confidence, bare - typos.penalty);
    });

    it("ignores a clause needing more than maxFixes repairs", () => {
        assert.equal(typos.maxFixes, 3);
        assert.equal(reply("wat teh lnik"), bare - 3 * typos.penalty >= threshold);
        assert.equal(reply("wat ths teh lnik"), false);
    });

    it("applies vetoes and doubts to the repaired text", () => {
        assert.equal(reply("wjat is a websit"), false);
        assert.equal(reply("send me teh link to teh zoom call"), false);
        assert.equal(reply("ok i got teh lnik thanks"), false);
    });

    it("cuts run-together words only when they are clearly a sentence", () => {
        for (const text of ["wjatisthesite", "whatisthesite", "wheresthelink", "wheretowatch"]) {
            assert.equal(reply(text), true, text);
        }

        for (const text of ["whatever", "wherever", "anywhere", "thereisnolink", "watchstream"]) {
            assert.equal(reply(text), false, text);
        }
    });
});

it("scores a named request above a bare one", () => {
    assert.ok(run("send me the animex link").confidence > run("send me the link").confidence);
});
