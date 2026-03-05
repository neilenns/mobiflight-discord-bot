const mainLogger = require('../logger');
const logger = mainLogger.child({ service: 'lockStaleThreads' });

const STALE_THREAD_AGE_IN_DAYS = parseInt(
	process.env.STALE_THREAD_AGE_IN_DAYS ?? '30',
);
const STALE_THREAD_AGE_IN_MS = STALE_THREAD_AGE_IN_DAYS * 24 * 60 * 60 * 1000;
const LOCK_STALE_THREADS = process.env.LOCK_STALE_THREADS === 'true';
const EXCLUDED_THREAD_IDS = new Set(
	(process.env.EXCLUDED_THREAD_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean),
);
const EXCLUDED_CHANNEL_IDS = new Set(
	(process.env.EXCLUDED_CHANNEL_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean),
);

// Extracts a Unix timestamp (ms) from a Discord snowflake ID.
function snowflakeToTimestamp(snowflake) {
	return Number(BigInt(snowflake) >> 22n) + 1420070400000;
}

// Returns the timestamp of the last activity in a thread.
function getLastActivityTimestamp(thread) {
	if (thread.lastMessageId) {
		return snowflakeToTimestamp(thread.lastMessageId);
	}
	return thread.createdTimestamp;
}

// Returns true if a thread has been inactive for longer than STALE_THREAD_AGE_IN_DAYS.
function isStaleThread(thread) {
	return Date.now() - getLastActivityTimestamp(thread) > STALE_THREAD_AGE_IN_MS;
}

// Checks all active threads in all guilds and locks any that have been inactive
// for longer than STALE_THREAD_AGE_IN_DAYS.
async function lockStaleThreads(client) {
	logger.info('Checking for stale threads...');

	for (const [, guild] of client.guilds.cache) {
		try {
			const activeThreads = await guild.channels.fetchActiveThreads();

			for (const [, thread] of activeThreads.threads) {
				try {
					if (thread.locked) {
						continue;
					}

					if (EXCLUDED_THREAD_IDS.has(thread.id)) {
						logger.debug(
							`Skipping excluded thread <#${thread.id}> in guild "${guild.name}"`,
							{
								thread: thread.name,
								threadId: thread.id,
								guild: guild.name,
								guildId: guild.id,
							},
						);
						continue;
					}

					if (EXCLUDED_CHANNEL_IDS.has(thread.parentId)) {
						logger.debug(
							`Skipping thread <#${thread.id}> in excluded channel <#${thread.parentId}> in guild "${guild.name}"`,
							{
								thread: thread.name,
								threadId: thread.id,
								channelId: thread.parentId,
								guild: guild.name,
								guildId: guild.id,
							},
						);
						continue;
					}

					if (!thread.manageable) {
						logger.warn(
							`No permission to manage thread <#${thread.id}> in guild "${guild.name}"`,
							{
								thread: thread.name,
								threadId: thread.id,
								guild: guild.name,
								guildId: guild.id,
							},
						);
						continue;
					}

					if (isStaleThread(thread)) {
						if (LOCK_STALE_THREADS) {
							await thread.send(
								`This thread has been inactive for ${STALE_THREAD_AGE_IN_DAYS} days and has been locked. If you have further questions or need additional help, please start a new thread.`,
							);
							await thread.setLocked(true);
							logger.info(
								`Locked stale thread "${thread.name}" in guild "${guild.name}"`,
								{
									thread: thread.name,
									threadId: thread.id,
									guild: guild.name,
									guildId: guild.id,
								},
							);
						}
						else {
							logger.info(
								`Found stale thread "${thread.name}" in guild "${guild.name}" (locking disabled)`,
								{
									thread: thread.name,
									threadId: thread.id,
									guild: guild.name,
									guildId: guild.id,
								},
							);
						}
					}
				}
				catch (threadError) {
					logger.error(
						`Error processing thread ${thread.id}: ${threadError.message}`,
						threadError,
					);
				}
			}
		}
		catch (guildError) {
			logger.error(
				`Error fetching threads for guild ${guild.id}: ${guildError.message}`,
				guildError,
			);
		}
	}

	logger.info('Finished checking for stale threads.');
}

module.exports = { lockStaleThreads };
