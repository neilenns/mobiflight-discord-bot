# Copilot Instructions

## Project Overview

This is the MobiFlight Discord bot, a Node.js application built with [discord.js](https://discord.js.org/) v14.
It assists with moderation of the MobiFlight Discord server by managing help threads and providing slash commands that link to wiki and YouTube resources.

## Tech Stack

- **Runtime**: Node.js
- **Bot framework**: discord.js v14
- **Logging**: Winston with optional transports for a Discord webhook (`winston-discord-transport`) and Logtail (`@logtail/winston`)
- **File watching**: chokidar (used to hot-reload JSON menu files without restarting the bot)
- **Environment variables**: dotenv
- **Linting**: ESLint v9 (`eslint:recommended` plus custom rules defined in `.eslint.json`)
- **Containerisation**: Docker (see `Docker/`)

## Repository Layout

```
src/
  index.js               # Entry point: loads commands and events, logs in to Discord
  deploy-commands.js     # Registers slash commands with the Discord API (run once or on change)
  logger.js              # Shared Winston logger; child loggers add a `service` label
  utilities.js           # replyOrEditReply() helper used by command handlers
  commands/
    general/
      wiki.js            # /wiki slash command
  events/
    ready.js             # Fires once when the bot connects
    interactionCreate.js # Routes incoming slash-command interactions to their handlers
    threadUpdate.js      # Locks/unlocks threads when the "Solved" tag is applied or removed
Docker/
  Dockerfile
  docker-compose.yml
  docker-entrypoint.sh
wikiMenuItems.json       # Sample wiki menu items (label, value, description, content[])
.eslint.json             # ESLint configuration
```

## Running the Bot

```bash
# Install dependencies
npm install

# Register slash commands with Discord (required before first run and after command changes)
npm run deploy-commands

# Start the bot
npm start

# Or do both in sequence
npm run deploy-and-start
```

## Linting

```bash
npx eslint .
```

There is no automated test suite. Validate behaviour by running the bot locally against a test Discord server.

## Environment Variables

| Variable               | Required | Description |
|------------------------|----------|-------------|
| `DISCORD_TOKEN`        | Yes      | Bot token from the Discord Developer Portal |
| `DISCORD_CLIENT_ID`    | Yes      | Application ID from the Discord Developer Portal |
| `DISCORD_GUILD_ID`     | Yes      | ID of the server where slash commands are registered |
| `ENABLE_COMMANDS`      | Yes      | Set to `true` to load and register slash commands |
| `WIKI_ITEMS_PATH`      | Yes      | Absolute path to the wiki menu JSON file |
| `YT_ITEMS_PATH`        | No       | Absolute path to the YouTube menu JSON file |
| `SOLVED_TAG_NAME`      | No       | Name of the forum tag that marks a thread as solved (default: `"Solved"`) |
| `OLD_THREAD_AGE_IN_DAYS` | No     | Threads older than this many days will not receive a closing message (default: `360`) |
| `LOG_LEVEL`            | No       | Winston log level (`info`, `debug`, etc.) |
| `BOT_LOG_WEBHOOK`      | No       | Discord webhook URL for bot-activity log messages |
| `LOGTAIL_TOKEN`        | No       | Logtail source token for log aggregation |

## Architecture

### Commands

Each file under `src/commands/<category>/` exports:

- `data` – a `SlashCommandBuilder` instance that defines the command's name, description, and options.
- `execute(interaction)` – async function called when the command is invoked.
- `init()` *(optional)* – async function called once at startup (used by `wiki.js` to load the menu and start file watching).
- `cooldown` *(optional)* – number of seconds before the same user can run the command again.

`src/index.js` discovers all command files automatically by walking the `src/commands/` directory tree.

### Events

Each file under `src/events/` exports:

- `name` – the `Events` constant from discord.js (e.g. `Events.InteractionCreate`).
- `once` *(optional, boolean)* – register with `client.once` instead of `client.on`.
- `execute(...args)` – async handler function.

### Wiki / YouTube Menu Items

The `/wiki` command reads a JSON file whose path is set in `WIKI_ITEMS_PATH`. Each entry has the following shape:

```json
{
  "label": "Human-readable label shown in the dropdown",
  "value": "machine-readable-key",
  "description": "Optional short description (max 100 chars)",
  "content": [
    "Line one of the Discord message to send.",
    "Line two of the Discord message to send."
  ]
}
```

`content` is joined with newlines and sent as a message to the channel. If `description` is omitted it is generated automatically from the first line of `content` by stripping markdown.

The file is hot-reloaded via chokidar whenever it changes on disk, so the bot does not need to be restarted after editing menu items.

### Thread Management

`src/events/threadUpdate.js` listens for the `ThreadUpdate` event. When a forum thread's applied tags change:

- **Solved tag added** → sends a friendly closing message (unless the thread is older than `OLD_THREAD_AGE_IN_DAYS`), then locks the thread.
- **Solved tag removed** → unlocks the thread and deletes the bot's closing message if it is the last message in the thread.

### Logging

`src/logger.js` creates a shared Winston logger. Import it and create a child logger with a `service` label:

```js
const mainLogger = require('../logger');
const logger = mainLogger.child({ service: 'my-service' });
```

All log output is written to the console. If `BOT_LOG_WEBHOOK` is set, errors are also sent to a Discord channel. If `LOGTAIL_TOKEN` is set, all logs are forwarded to Logtail.

## Code Style

Enforced by ESLint (`.eslint.json`):

- **Indentation**: tabs
- **Quotes**: single quotes
- **Semicolons**: required
- **Variable declarations**: `const` / `let` only (no `var`)
- **Brace style**: Stroustrup (opening brace on same line, `else`/`catch` on new line)
- **Trailing commas**: required in multi-line constructs
- Inline comments are not allowed; put comments on their own line

## Docker

The bot is published to `ghcr.io/neilenns/mobiflight-discord-bot:latest`. A ready-to-use `docker-compose.yml` is in the `Docker/` directory. Menu JSON files are typically mounted into the container as a volume.
