import type { ApplicationCommandDataResolvable, Client, ClientEvents, } from "discord.js";
import type { LoadedCommand, LoadedEvent } from "./types.js";
import { loadCommands, loadEvents } from "./load.js";
import { setCommands } from "./registry.js";
import { Logena } from "logena";


export async function register(client: Client): Promise<void> {
    const startTime = performance.now();

    if (!client.application) {
        throw new Error("Client application is not available");
    }

    const [commands, events] = await Promise.all([
        loadCommands(),
        loadEvents(),
    ]);

    setCommands(commands);

    for (const event of events) {
        registerEvent(client, event);
    }

    await client.application.commands.set(commandData(commands));

    const elapsed = (performance.now() - startTime).toFixed(2);

    Logena.info(
        `Registered ${events.length} events and ${commands.length} commands in ${elapsed}ms`,
    );
}

function commandData(
    commands: readonly LoadedCommand[],
): ApplicationCommandDataResolvable[] {
    // Hardcoded list of command types - these should match the CommandType definition
    const commandTypes = ["chatInput", "userContext", "messageContext"] as const;
    
    return commands.flatMap((command) =>
        commandTypes.flatMap((type) => {
            const entry = command[type];

            return entry ? [entry.data] : [];
        }),
    );
}

/**
 * The single error boundary for listeners: handlers may throw and the process
 * keeps running.
 */
function registerEvent<K extends keyof ClientEvents>(
    client: Client,
    event: LoadedEvent<K>,
): void {
    const execute = (...args: ClientEvents[K]): void => {
        void (async () => {
            try {
                await event.execute(...args);
            } catch (error: unknown) {
                Logena.error(
                    `Error encountered in event execution [${String(event.name)}]: ${error instanceof Error ? error.message : String(error)}`,
                );
            }
        })();
    };

    if (event.once) {
        client.once(event.name, execute);
    } else {
        client.on(event.name, execute);
    }
}
