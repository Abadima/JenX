import type { LoadedCommand } from "./types.js";

let commands = new Map<string, LoadedCommand>();

export function setCommands(loadedCommands: LoadedCommand[]): void {
    commands = new Map(
        loadedCommands.map((command) => [
            command.definition.name,
            command,
        ]),
    );
}

export function getCommand(name: string): LoadedCommand | undefined {
    return commands.get(name);
}