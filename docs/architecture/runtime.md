# Runtime: Loading and Registration

`src/kernel/load.ts` reads the compiled tree next to itself (`build/`), so the bot must run from build output.

## Commands

1. Scan `src/commands/{category}/{command}/` (one directory read per level, `readEntries`).
2. `index.js` must export `command` with `name`, `types` and optional `description`. There is no folder-name fallback and no default export.
3. For each entry in `types`, load `<type>.js`, which must export `data` and `execute`. `CommandInteractions` in `src/kernel/types.ts` maps each type to its interaction type; adding a type there is the only place to touch.
4. `category` is filled in from the folder; the result goes into the registry.

## Events

Every file under `src/events/` is imported:

- `execute` - required for a listener; there is no default export.
- `name` - optional. Defaults to the filename, except `index.js`, which is named after its folder (`messageCreate/index.js` -> `messageCreate`).
- `once` - optional, defaults to `false`.
- `event = false` - helper module; skipped and never registered.

## Event folder convention

One file per responsibility, following `src/events/interactionCreate/commands.ts`:

```
src/events/messageCreate/
├── index.ts        # listener: filters and dispatch (registered)
└── animexlinks.ts  # helper: link assistant (event = false)
```

Add a responsibility by creating `src/events/messageCreate/<name>.ts` exporting `event = false` plus a handler, and calling it from `index.ts`.

## Registration

`src/kernel/register.ts`

1. Fails fast if `client.application` is missing, before any side effect.
2. Loads commands and events in parallel; load failures are logged and thrown once, in `load.ts`.
3. Populates the registry, registers listeners, publishes application commands.

The listener wrapper in `register.ts` is the single error boundary: it logs with Logena, so event handlers may throw without killing the process and without their own try/catch.
