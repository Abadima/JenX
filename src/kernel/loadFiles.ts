import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface DirectoryEntries {
    directories: string[];
    files: string[];
}

export async function readEntries(
    directory: string,
    extension = ".js",
): Promise<DirectoryEntries> {
    const entries = await readdir(directory, {
        withFileTypes: true,
    });

    return {
        directories: entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => join(directory, entry.name)),
        files: entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
            .map((entry) => join(directory, entry.name)),
    };
}
