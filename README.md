# Mobiflight Discord Bot

Discord bot to assist with moderation of the Mobiflight discord

## Supported slash commands

| Command | Description |
| - | - |
| /wiki *topic* | Shares a link to the wiki topic |
| /yt *topic* | Shares a link to the YouTube video on that topic |

## Deploying

This repo is available as a Docker image at ghcr.io/neilenns/mobiflight-discord-bot:latest. A sample
`docker-compose.yml`` file is located in the Docker folder.

The following environment variables must be set for the bot to work properly:

| Environment variable | Description |
| - | - |
| DISCORD_TOKEN | The public key for the bot from the [Discord Developer Portal](https://discord.com/developers/applications/).
| DISCORRD_CLIENT_ID | The application ID for the bot from the [Discord Developer Portal](https://discord.com/developers/applications/).
| DISCORD_GUILD_ID | The [ID of the server](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-) the slash commands should be registered with. 
| SOLVED_TAG_NAME | The name of the tag that indicates a thread is solved. Case insensitive.
| ENABLE_COMMANDS | Enables registering the slash commands. Should probably always be set to `true`.
| WIKI_ITEMS_PATH | Path to the JSON file with the `/wiki` command menu items.
| YT_ITEMS_PATH | Path to the JSON file with the `/yt` command menu items.

Typically the JSON files will be mounted to the Docker container via a volume. The `docker-compose.yml` file in the `Docker` folder shows how this is done.