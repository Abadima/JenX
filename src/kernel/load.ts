import type { ApplicationCommandDataResolvable, ClientEvents, } from "discord.js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { basename, dirname, join } from "node:path";
import { readEntries } from "./loadFiles.js";
import { Logena } from "logena";

import type {
    CommandDefinition,
    CommandEntry,
    CommandInteractions,
    CommandType,
    LoadedCommand,
    LoadedEvent,
} from "./types.js";

/**
 * Discovery of commands and events from the compiled output.
 *
 * Contracts (one shape per file, no aliases):
 * - command definition: `index.js` exports `command`
 * - command handler: `<type>.js` exports `data` and `execute`
 * - event: exports `execute` (and optionally `name`, `once`); a file exporting
 *   `event = false` is a helper module and is not registered
 */

const CONTENT_ROOT = fileURLToPath(new URL("../", import.meta.url));

function formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

async function importModule<T>(file: string): Promise<T> {
    return import(pathToFileURL(file).href) as Promise<T>;
}

async function loadCommandEntry<T extends CommandType>(
    commandPath: string,
    type: T,
): Promise<CommandEntry<CommandInteractions[T]>> {
    const file = join(commandPath, `${type}.js`);

    try {
        const module = await importModule<{
            data?: ApplicationCommandDataResolvable;
            execute?: (interaction: CommandInteractions[T]) => unknown;
        }>(file);

        if (!module.data) {
            throw new Error(`Command entry point does not export "data": ${file}`);
        }

        if (!module.execute) {
            throw new Error(
                `Command entry point does not export "execute": ${file}`,
            );
        }

        return { data: module.data, execute: module.execute };
    } catch (error) {
        Logena.error(
            `Failed to load command entry point '${type}' in '${commandPath}': ${formatError(error)}`,
        );

        throw new Error(
            `Failed to load command entry point '${type}' in '${commandPath}'`,
            { cause: error },
        );
    }
}

export async function loadCommands(): Promise<LoadedCommand[]> {
    const { directories: categoryPaths } = await readEntries(
        join(CONTENT_ROOT, "commands"),
    );
    const commands: LoadedCommand[] = [];

    for (const categoryPath of categoryPaths) {
        const category = basename(categoryPath);
        const { directories: commandPaths } = await readEntries(categoryPath);

        for (const commandPath of commandPaths) {
            const definitionPath = join(commandPath, "index.js");

            try {
                const module = await importModule<{
                    command?: CommandDefinition;
                }>(definitionPath);

                if (!module.command) {
                    throw new Error(
                        `Command does not export "command": ${definitionPath}`,
                    );
                }

                const loaded: LoadedCommand = {
                    definition: { ...module.command, category },
                };

                for (const type of module.command.types) {
                    loaded[type] = await loadCommandEntry(commandPath, type);
                }

                commands.push(loaded);
            } catch (error) {
                Logena.error(
                    `Failed to load command '${category}': ${formatError(error)}`,
                );

                throw new Error(`Failed to load command '${category}'`, {
                    cause: error,
                });
            }
        }
    }

    return commands;
}

/** `index.js` is named after its event folder; other files after themselves. */
function eventNameFromFile(file: string): keyof ClientEvents {
    const name = basename(file, ".js");

    return (
        name === "index" ? basename(dirname(file)) : name
    ) as keyof ClientEvents;
}

export async function loadEvents(): Promise<
    LoadedEvent<keyof ClientEvents>[]
> {
    return loadEventDirectory(join(CONTENT_ROOT, "events"));
}

async function loadEventDirectory(
    directory: string,
): Promise<LoadedEvent<keyof ClientEvents>[]> {
    const { directories, files } = await readEntries(directory);
    const events: LoadedEvent<keyof ClientEvents>[] = [];

    for (const file of files) {
        const event = await loadEvent(file);

        if (event) events.push(event);
    }

    for (const subdirectory of directories) {
        events.push(...await loadEventDirectory(subdirectory));
    }

    return events;
}

async function loadEvent(
    file: string,
): Promise<LoadedEvent<keyof ClientEvents> | null> {
    try {
        const module = await importModule<{
            name?: keyof ClientEvents;
            execute?: LoadedEvent<keyof ClientEvents>["execute"];
            once?: boolean;
            event?: boolean;
        }>(file);

        if (module.event === false) return null;

        if (!module.execute) {
            throw new Error(`Event does not export "execute": ${file}`);
        }

        const event: LoadedEvent<keyof ClientEvents> = {
            name: module.name ?? eventNameFromFile(file),
            execute: module.execute,
        };

        if (module.once !== undefined) event.once = module.once;

        return event;
    } catch (error) {
        Logena.error(`Failed to load event '${file}': ${formatError(error)}`);

        throw new Error(`Failed to load event '${file}'`, { cause: error });
    }
}
