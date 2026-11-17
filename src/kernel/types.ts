import type {
    ApplicationCommandDataResolvable,
    ChatInputCommandInteraction,
    ClientEvents,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction,
} from "discord.js";

/** Command entry kind. Add a type here and in `CommandInteractions` only. */
export type CommandType = "chatInput" | "userContext" | "messageContext";

/** Interaction type handled by each command entry file. */
export interface CommandInteractions {
    chatInput: ChatInputCommandInteraction;
    userContext: UserContextMenuCommandInteraction;
    messageContext: MessageContextMenuCommandInteraction;
}

export interface CommandDefinition {
    name: string;
    category: string;
    description?: string;
    types: readonly CommandType[];
}

export type CommandInteraction = CommandInteractions[CommandType];

export interface CommandEntry<T extends CommandInteraction = CommandInteraction> {
    data: ApplicationCommandDataResolvable;
    execute: (interaction: T) => unknown | Promise<unknown>;
}

export type LoadedCommand = {
    definition: CommandDefinition;
} & {
    [T in CommandType]?: CommandEntry<CommandInteractions[T]>;
};

export interface LoadedEvent<
    K extends keyof ClientEvents = keyof ClientEvents,
> {
    name: K;
    once?: boolean;
    execute: (...args: ClientEvents[K]) => unknown;
}
