/**
 * Prints the words for `TYPO_GUARD` in config.ts (real words the repair would rewrite).
 *   aspell -d en_US dump master | tr A-Z a-z | grep -E '^[a-z]+$' | sort -u > words.txt
 *   bun scripts/typo-guard.ts words.txt
 */
import { readFileSync } from "node:fs";

import { ANIMEX_LINKS_CONFIG } from "../src/features/message-assistant/config.js";
import { repairOptions } from "../src/features/message-assistant/matcher.js";

const { typos, pluralNouns } = ANIMEX_LINKS_CONFIG;
// Folded plurals and shorthand ("wats") are repaired on purpose.
const skip = new Set([
    ...pluralNouns.map((noun) => `${noun}s`),
    ...Object.keys(typos.shorthand),
]);

const guard = readFileSync(process.argv[2] ?? "", "utf8")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !skip.has(word))
    .filter((word) => repairOptions(word, true).length > 0)
    .sort();

console.log(guard.join(" "));
