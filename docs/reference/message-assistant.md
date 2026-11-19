# AnimeX Link Assistant

Deterministic, keyword/regex only. No AI, ML, external calls or extra dependencies.

## Files

| Concern | Location |
| --- | --- |
| Vocabulary, frames, doubts, vetoes, weights, threshold, length, typo settings, sections, embed copy, cooldown length | `src/features/message-assistant/config.ts` |
| Message preparation, typo repair and scoring | `src/features/message-assistant/matcher.ts` |
| What counts as a finger slip (keyboard layout) | `src/features/message-assistant/typo.ts` |
| Regenerating the typo guard list | `scripts/typo-guard.ts` |
| Channel throttle | `src/features/message-assistant/cooldown.ts` |
| Discord reply + cooldown wiring | `src/events/messageCreate/animexlinks.ts` |
| Examples and tests | `tests/fixtures/animex-links.ts`, `tests/features/message-assistant/matcher.test.ts` |

The bot runs the compiled `build/`: changes need `bun run build` and a restart.

## Matching

`matchAnimeXLinks(text)` returns `{ matched, confidence, section? }`.

1. **Prepare.** Mentions, emoji, URLs and domains are removed and the text is split into **clauses** at punctuation and at `clauseBreakers` (`but`, `if`, `when`, ...). Each clause is canonicalized: lowercase, apostrophes removed (`i'd` -> `id`), 3+ repeated letters collapsed, plurals in `pluralNouns` folded.
2. More than `length.maxWords` words, or any `negativePatterns` match, returns 0.
3. **Frames.** A clause is a request if a `patterns` frame matches it and no `clauseVetoes` pattern does. Only that clause is credited; the one with the most evidence wins.
4. **Typo pass**, only if step 3 found nothing (see "Typos").
5. **Score.** Topic and section come from the winning clause, the name bonus from the whole message; length, doubts and repairs are subtracted.

### Scoring

An integer heuristic out of 100, not a probability:

| Evidence | Points |
| --- | --- |
| request frame matched | 50 |
| strong topic word in that clause (AnimeX name, website, site, url, link, homepage, watch/stream, or a section word naming a destination such as "catalog page") | 40 |
| AnimeX name anywhere in the message | 10 |
| section word in that clause | 10 |
| each word beyond `length.freeWords` (20) | -1 |
| a matching doubt | -30 |
| each repaired word the matched request relies on | -3 |

A frame plus a topic word is 90, which is what a bare "whats the link" scores; the gap to `threshold` is the room for penalties. No single signal can pass. The threshold has been moved between 80 and 90, so the tests are written against the config.

### Request frames

A frame is anchored at the start of a clause after an optional lead-in of up to six closed-class words (`hey`, `guys`, `pls`, `can you`, ...). Between the ask and the destination only **function words** may appear (`me`, `the`, `new`, the site name; at most five). Content words break the frame whatever their number, which is what keeps "do i have to keep manually full screen the site" and "blocked where I'd have to use a VPN, just to use animex" from reading as requests. A word window cannot tell them apart.

- question word + destination: "whats the animex link", "where is the schedule page"
- `where` + modal + find/get/watch: "where can i watch anime"
- `how` + modal + get to/access/find destination, or watch/stream anime: "how do i get to animex" (not "how do i use the site")
- transfer verb + destination: "send me the link", "dm me the link"
- need/want/looking for + destination: "i need the animex link"
- asking someone: "anyone have the link", "can i get the url" (not "do i have to ...")
- site name + noun, noun + please, section + page: "animex link", "link pls", "catalog page" (a bare "animex" is not a request)
- noun + to/for destination: "link to animex", "link to watch anime"

### Evidence, doubts and vetoes

- **Section words are not topic words.** `home`, `browse`, `catalog`, `schedule`, `airing` and `community` complete a frame and pick the highlighted link but alone score at most 60; they count as a topic only naming a destination ("catalog page") or next to a strong word. To make one strong, add it to `keywords`.
- **`clauseVetoes`** disqualify one clause: first-person statements ("ok i got the link", "id use the link"; a question word first keeps "can i have the link") and the site as the object of another action ("give the site a chance", "share animex with your friends").
- **`doubts`** subtract points: a link for something else ("the link to the zoom call") and talk about the site's behaviour ("i want animex to add dubs").
- **`negativePatterns`** discard the whole message: possession, their own work, building/hosting/outages, definitions, recommendations and polls, other services, and unrelated senses (my schedule, broken link).

## Message length

`length.maxWords` (30) ignores longer messages; past `freeWords` (20) each word costs `penaltyPerWord` (1), so a longer message needs more evidence. `maxWords` must not exceed `freeWords + (100 - threshold) / penaltyPerWord` (40 at threshold 80); a test enforces it. 30 is a judgment call, not a measurement: requests run about 2-15 words and rarely pass 25. A missed reply costs little; a wrong one spams the channel and starts the cooldown.

## Typos

Runs only when nothing matches as typed, so it can add a match but never change one.

- **A slip of the fingers** (`typo.ts`): a dropped key, a doubled or extra key next to the intended one (`linkk`, `an8ime`), swapped neighbours (`lnik`) or a neighbouring key (`wjat`: j is next to h). `mhat` and `line` are not typos of `what` and `link`.
- **Only into `typos.targets`**: question words, site nouns, the site name, `watch`, `stream` and a few verbs. Other grammar words (`can`, `the`) are repaired only when two letters are swapped (`cna`, `teh`); `typos.shorthand` covers slang too short to judge (`te`, `wat`).
- **Real words are never repaired.** `typos.guard` lists those a repair would rewrite (`steam`, `fro`), generated by `scripts/typo-guard.ts` from a dictionary that does not ship; a test fails on stale entries.
- **The frames settle ambiguous slips**: `wnat` is `want` or `what`, so "hey wnat the link" replies and "wnat to go home" does not.
- **Run-together words** ("wjatisthesite") are cut into frame words only when that gives three or more with at most one misspelt.
- **Repairs cost `typos.penalty`** (3, only those the matched request uses); a clause needing more than `typos.maxFixes` (3) is ignored. Vetoes and doubts are checked on the repaired text.

## Sections and response

`sections` defines homepage/catalog/schedule/community: label, URL and trigger words. Adding a section makes its words complete frames and select the highlighted link. The section comes from the request's clause, so "whats the animex link when you get home" does not highlight the homepage. A detected section is listed first and bolded in the embed; otherwise all links are listed in config order.

## Cooldown

The reply throttle is **per channel**: after a successful reply, that channel gets no further AnimeX embed for `cooldownMs` (60 s), whoever asks next. Other channels are unaffected, and there is no per-user limit.

`ChannelCooldown` (`cooldown.ts`) is an in-memory map of channel ID -> expiry time plus a set of channels with a reply in flight:

- `claim()` reserves the channel, refusing when it is cooling down or already reserved, so two simultaneous matching messages cannot both reply.
- `confirm()` clears the reservation and starts the 60 s window; expired entries are pruned at the same time, so the map stays bounded.
- `release()` clears the reservation without starting a window; `handleAnimeXLinks()` calls it when `reply()` rejects, so a failed Discord call never consumes the cooldown.

## Footer

`{confidence}% Confidence | {ms}ms`, e.g. `90% Confidence | 0.12ms`. ms is the wall time of `matchAnimeXLinks()` alone. Unmatched messages send no embed.

## Examples and tests

`tests/fixtures/animex-links.ts` exports `POSITIVE_EXAMPLES` (must reach the threshold), `NEGATIVE_EXAMPLES` and `AMBIGUOUS_EXAMPLES` (both must stay silent); every reported false positive is in the negatives. Run the suite with `bun test tests`. Nothing tests `cooldown.ts` or the Discord handler yet.

## Known limits

- A request that names the link only as "it" ("can someone send it") is not matched, and neither are section-only questions, a bare "animex" or "link?".
- Frames know only the closed lists in `config.ts`; a content word between ask and destination ("send me the free link") is missed.
- Vetoes are literal ("hostd" escapes the hosting veto), a slip that is itself a real word (`animex` as `anime`) cannot be repaired, and neither can two slips in one word.
- The scoring has never been compared with real server traffic.
