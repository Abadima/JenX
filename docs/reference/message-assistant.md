# AnimeX Link Assistant

Deterministic, keyword/regex only. No AI, ML, external calls or extra dependencies.

## Files

| Concern | Location |
| --- | --- |
| Trigger keywords, names, patterns, exclusions | `src/features/message-assistant/config.ts` |
| Evidence weights and threshold | `config.ts` -> `ANIMEX_LINKS_CONFIG.weights`, `.threshold` |
| Section keywords, labels and destination URLs | `config.ts` -> `.sections` (single source: section words also feed topic matching and patterns) |
| Channel cooldown length | `config.ts` -> `.cooldownMs` (enforced by `cooldown.ts`) |
| Embed title/description/colour/thumbnail | `config.ts` -> `.response` |
| Scoring engine | `src/features/message-assistant/matcher.ts` |
| Channel throttle | `src/features/message-assistant/cooldown.ts` |
| Evaluation examples | `tests/fixtures/animex-links.ts` |
| Discord reply + cooldown wiring | `src/events/messageCreate/animexlinks.ts` |

## Matching

`matchAnimeXLinks(text)` returns `{ matched, confidence, section? }`. It first canonicalizes the message once (lowercase, apostrophes removed, 3+ repeated letters collapsed, punctuation to spaces, plurals singularized); every check below reads that one canonical form, so patterns only need singular words.

1. Every `negativePatterns` entry is tested first. Any match returns `confidence: 0` and no reply, even when the rest of the message looks like a request.
2. `patterns` decide request intent: one boolean, true if any pattern matched.
3. `classify()` reports three independent facts: topic word (`keywords` + section words), explicit site name (`names`), and requested section.

Confidence is an **integer heuristic score out of 100**, not a probability:

| Evidence | Points |
| --- | --- |
| topic word (website, link, url, watch, or a section word) | 40 |
| request/question shape (any `patterns` match) | 40 |
| explicit AnimeX name (`animex`, `animx`, `animexx`, `anime x`) | 10 |
| requested section (homepage/catalog/schedule/community) | 10 |

`threshold` = 80, i.e. topic **and** intent. The score is the capped sum of matched classes, so it can only take the values 0-100 in 10-point steps and no single signal can pass on its own (topic alone 40, intent alone 40, name alone 10, section alone 10). Because scoring is class-based rather than frequency-based, wording variants that carry the same evidence get the same score: "yo where the animex at" and "yo where that animex at" both score 90.

This replaced the earlier float model (`0.4 * keyword + 0.2 * alias + 0.4 * pattern`, capped at 1). That model reported `80%` for every topic-plus-regex message, which implied a probability it never computed; the alias class was also redundant with name plus topic. The score now states how much evidence matched and nothing about odds.

## Request versus mention

Intent patterns describe asking: a question word followed by a reference, "can/could/would you" plus a request verb, a request verb followed by a reference, a watch/stream phrasing, a section word plus "page/link/url", a reference next to please, or the bare site name ("animex link").

Negative patterns veto the ways these words appear without a request. Each covers a category, not a phrase:

- **Ownership or state**: first-person have/got/made/found/like/love/sent/saw/use plus a reference ("I have a website", "I already have the link"), unless the message starts like a question ("can i have the website link").
- **Possession**: "my/our" before a reference ("where is my website", "my site is down").
- **Their own work**: "my/our portfolio, project, business, ..." ("i need a link to my portfolio"); "website for my ...".
- **Building/hosting/outage**: build/design/host verbs near a site word, site words near builder/template/hosting/domain/down/broken/work.
- **Definition and recommendation**: "what is a website", "best/good/recommend ... site".
- **Other services**: a platform name (youtube, netflix, crunchyroll, discord, ...) means the link asked for is not ours.
- **Unrelated senses**: my schedule/calendar, broken/dead link, hating sites.

## Sections and response

`sections` defines homepage/catalog/schedule/community: label, URL and trigger words. Those words are also topic words and are included in the pattern vocabulary, so adding a section makes its words match automatically. When a section is detected it is listed first and bolded in the embed; otherwise all links are listed in config order.

## Cooldown

The reply throttle is **per channel**: after a successful reply, that channel gets no further AnimeX embed for `cooldownMs` (60 s), whoever asks next. Other channels are unaffected, and there is no per-user limit.

`ChannelCooldown` (`cooldown.ts`) is an in-memory map of channel ID -> expiry time plus a set of channels with a reply in flight:

- `claim()` reserves the channel, refusing when it is cooling down or already reserved, so two simultaneous matching messages cannot both reply.
- `confirm()` clears the reservation and starts the 60 s window; expired entries are pruned at the same time, so the map stays bounded.
- `release()` clears the reservation without starting a window; `handleAnimeXLinks()` calls it when `reply()` rejects, so a failed Discord call never consumes the cooldown.

## Footer

The embed footer is generated per reply as `{points}% heuristic confidence | {ms}ms`, e.g. `90% heuristic confidence | 0.12ms`:

- points = the integer `confidence` from the match for this message (0-100 evidence points, as above).
- ms = wall time of `matchAnimeXLinks()` alone (normalization + scoring), measured with monotonic `performance.now()`, clamped at 0 and formatted with `toFixed(2)`. It is not Discord/network latency and is never estimated.

Unmatched messages send no embed, so no footer is produced. The wording is deliberately "heuristic": no representative labeled corpus has been measured, so no calibration claim is made.

## Examples

`tests/fixtures/animex-links.ts` exports `POSITIVE_EXAMPLES` (must reach 80 points), `NEGATIVE_EXAMPLES` (must stay silent: statements, ownership, building, recommendation, other services, unrelated senses) and `AMBIGUOUS_EXAMPLES` (reviewed judgment calls: references or fragments without a request shape, intentionally silent). They are used by `tests/features/message-assistant/matcher.test.ts`; channel cooldown, isolation, failure and concurrency are covered by `tests/features/message-assistant/cooldown.test.ts` and `tests/events/messageCreate.test.ts`. They are not training data or runtime configuration.

Tests assert decisions (matches, silence, veto to 0) and ordering (named > bare request > statement) rather than one arbitrary score per phrase; a few exact scores are asserted only where they express the threshold model. Adding an example changes no runtime behaviour; adding a trigger requires editing `config.ts`. The same fixtures run under `bun test` and `node --test`.
