import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Logena } from "logena";

const watchMode = process.argv.includes("--watch");

Logena.set({
    appName: "JENX BUILD",
    colors: {
        appName: "pink",
    },
    debug:
        process.argv.includes("--dev") ||
        process.env.NODE_ENV === "development",
    useTimestamps: false,
});

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const nodePath = process.execPath;

function resolveToolScript(toolName) {
    if (toolName === "tsc") {
        return path.join(
            repoRoot,
            "node_modules",
            "typescript",
            "bin",
            "tsc",
        );
    }

    if (toolName === "oxlint") {
        const binName =
            process.platform === "win32" ? "oxlint.cmd" : "oxlint";

        return path.join(repoRoot, "node_modules", ".bin", binName);
    }

    throw new Error(`Unknown tool: ${toolName} `);
}

function runCommand(file, args, { prefix } = {}) {
    return new Promise((resolve) => {
        const commandLabel = `${path.basename(file)} ${args.join(" ")} `.trim();

        Logena.debug(
            `${prefix ? `${prefix} ` : ""} RUNNING: ${commandLabel} `,
        );

        const child = spawn(file, args, {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
            cwd: repoRoot,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
            const text = chunk.toString();

            stdout += text;

            for (const line of text.split(/\r?\n/)) {
                if (line.trim()) Logena.info(line);
            }
        });

        child.stderr.on("data", (chunk) => {
            const text = chunk.toString();

            stderr += text;

            for (const line of text.split(/\r?\n/)) {
                if (line.trim()) Logena.error(line);
            }
        });

        child.on("close", (code) => {
            resolve({
                code: code ?? 0,
                stdout,
                stderr,
            });
        });
    });
}

function runNodeScript(scriptPath, args, options) {
    return runCommand(nodePath, [scriptPath, ...args], options);
}

async function cleanBuild() {
    Logena.info("CLEANING BUILD...");

    try {
        await rm(path.join(repoRoot, "build"), {
            recursive: true,
            force: true,
        });

        Logena.info("BUILD CLEANED");
        return true;
    } catch (error) {
        Logena.error(
            `FAILED TO CLEAN BUILD: ${error instanceof Error
                ? (error.stack ?? error.message)
                : String(error)
            } `,
        );

        return false;
    }
}

async function runOxlintFix() {
    Logena.info("RUNNING OXLINT FIX...");

    const oxlintPath = resolveToolScript("oxlint");

    const { code } = await runCommand(
        oxlintPath,
        ["--fix"],
        { prefix: "OXLINT" },
    );

    if (code !== 0) {
        Logena.warn(`OXLINT EXITED WITH CODE ${code} `);
        return false;
    }

    Logena.info("OXLINT FINISHED");
    return true;
}

async function runTscBuild() {
    Logena.info("RUNNING TSC BUILD...");

    const tscPath = resolveToolScript("tsc");

    const { code } = await runNodeScript(
        tscPath,
        ["--project", "tsconfig.json"],
        { prefix: "TSC" },
    );

    if (code !== 0) {
        Logena.error(`TSC EXITED WITH CODE ${code} `);
        return false;
    }

    Logena.info("TSC BUILD FINISHED");
    return true;
}

function startTscWatch(onCompilationFinished) {
    const tscPath = resolveToolScript("tsc");

    Logena.info("STARTING TSC WATCH...");

    const child = spawn(
        nodePath,
        [
            tscPath,
            "--watch",
            "--project",
            "tsconfig.json",
        ],
        {
            stdio: ["ignore", "pipe", "pipe"],
            windowsHide: true,
            cwd: repoRoot,
        },
    );

    const handleLine = (line, streamName) => {
        const trimmed = line.trimEnd();

        if (!trimmed) return;

        if (streamName === "stderr") {
            Logena.error(trimmed);
        } else {
            Logena.info(trimmed);
        }

        const match = trimmed.match(/Found (\d+) errors?\./);

        if (!match) return;

        const errorCount = Number(match[1] ?? "0");

        onCompilationFinished(errorCount);
    };

    child.stdout.on("data", (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
            handleLine(line, "stdout");
        }
    });

    child.stderr.on("data", (chunk) => {
        for (const line of chunk.toString().split(/\r?\n/)) {
            handleLine(line, "stderr");
        }
    });

    child.on("close", (code) => {
        Logena.error(
            `TSC WATCH EXITED WITH CODE ${code ?? 0} `,
        );

        process.exit(code ?? 1);
    });

    return child;
}

async function runBuild() {
    const cleaned = await cleanBuild();

    if (!cleaned) {
        Logena.warn("CLEAN FAILED; CONTINUING TO BUILD");
    }

    const built = await runTscBuild();

    if (!built) {
        process.exit(1);
    }

    await runOxlintFix();
}

const tscWatchBuild = async () => {
    let running = false;
    let pendingBuilds = 0;

    const runQueuedBuilds = async () => {
        if (running) return;

        running = true;

        try {
            while (pendingBuilds > 0) {
                pendingBuilds--;

                Logena.info("TSC WATCH: 0 ERRORS");

                await runOxlintFix();
            }
        } finally {
            running = false;
        }
    };

    startTscWatch((errorCount) => {
        if (errorCount > 0) {
            Logena.warn(
                `TSC WATCH: FOUND ${errorCount} ERRORS(SKIPPING OXLINT)`,
            );

            return;
        }

        pendingBuilds++;

        void runQueuedBuilds();
    });
};

if (watchMode) {
    await tscWatchBuild();
} else {
    await runBuild();
}