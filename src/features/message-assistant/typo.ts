/**
 * A typo is a slip of the fingers: a dropped key, a doubled or extra key next
 * to the intended one, two swapped neighbours, or a neighbouring key hit
 * instead ("wjat": j is next to h). "mhat" is not one: nobody hits m for w.
 */

const KEY_ROWS: readonly { keys: string; offset: number }[] = [
    { keys: "1234567890", offset: 1.5 },
    { keys: "qwertyuiop", offset: 2 },
    { keys: "asdfghjkl", offset: 2.25 },
    { keys: "zxcvbnm", offset: 2.75 },
];

const KEY_POSITION = new Map<string, readonly [number, number]>();

KEY_ROWS.forEach(({ keys, offset }, row) => {
    [...keys].forEach((key, index) => {
        KEY_POSITION.set(key, [offset + index, row]);
    });
});

function adjacent(a: string, b: string): boolean {
    const first = KEY_POSITION.get(a);
    const second = KEY_POSITION.get(b);

    if (!first || !second) return false;

    return Math.hypot(first[0] - second[0], first[1] - second[1]) <= 1.3;
}

function withinOneEdit(a: string, b: string): boolean {
    if (a === b) return true;

    const lengthA = a.length;
    const lengthB = b.length;

    if (Math.abs(lengthA - lengthB) > 1) return false;

    if (lengthA === lengthB) {
        let first = -1;

        for (let index = 0; index < lengthA; index++) {
            if (a[index] === b[index]) continue;

            if (first === -1) {
                first = index;
                continue;
            }

            return (
                index === first + 1 &&
                a[first] === b[index] &&
                a[index] === b[first] &&
                a.slice(index + 1) === b.slice(index + 1)
            );
        }

        return true;
    }

    const [shorter, longer] = lengthA < lengthB ? [a, b] : [b, a];
    let index = 0;

    while (index < shorter.length && shorter[index] === longer[index]) index++;

    return shorter.slice(index) === longer.slice(index + 1);
}

export function isPlausibleTypo(typed: string, intended: string): boolean {
    if (typed === intended || !withinOneEdit(typed, intended)) return false;

    if (typed.length === intended.length) {
        let first = -1;

        for (let index = 0; index < typed.length; index++) {
            if (typed[index] === intended[index]) continue;

            if (first === -1) {
                first = index;
                continue;
            }

            return true; // two differences can only be a swap
        }

        return adjacent(typed[first]!, intended[first]!);
    }

    if (typed.length < intended.length) return true;

    // An extra key: a repeat of its neighbour, or a key touching a neighbour.
    for (let index = 0; index < typed.length; index++) {
        if (typed.slice(0, index) + typed.slice(index + 1) !== intended) continue;

        const extra = typed[index]!;
        const before = typed[index - 1];
        const after = typed[index + 1];

        if (extra === before || extra === after) return true;
        if (before !== undefined && adjacent(extra, before)) return true;
        if (after !== undefined && adjacent(extra, after)) return true;
    }

    return false;
}
