/** Channel-scoped reply throttle with in-flight reservations. */
export class ChannelCooldown {
    readonly #expiresAt = new Map<string, number>();
    readonly #pending = new Set<string>();
    readonly #durationMs: number;

    constructor(durationMs: number) {
        this.#durationMs = durationMs;
    }

    get size(): number {
        return this.#expiresAt.size + this.#pending.size;
    }

    /** Reserves the channel if it is free; call `confirm` or `release` after. */
    claim(channelId: string, now: number): boolean {
        if (this.#pending.has(channelId)) return false;

        const expiresAt = this.#expiresAt.get(channelId);

        if (expiresAt !== undefined) {
            if (expiresAt > now) return false;
            this.#expiresAt.delete(channelId);
        }

        this.#pending.add(channelId);

        return true;
    }

    /** Ends the reservation after a successful reply and starts the cooldown. */
    confirm(channelId: string, now: number): void {
        this.#pending.delete(channelId);
        this.#prune(now);
        this.#expiresAt.set(channelId, now + this.#durationMs);
    }

    /** Ends the reservation without starting the cooldown. */
    release(channelId: string): void {
        this.#pending.delete(channelId);
    }

    #prune(now: number): void {
        for (const [channelId, expiresAt] of this.#expiresAt) {
            if (expiresAt <= now) this.#expiresAt.delete(channelId);
        }
    }
}
