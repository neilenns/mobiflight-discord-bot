const { Events } = require("discord.js");
const mainLogger = require("../logger");
const logger = mainLogger.child({ service: "threadUpdate" });

// Returns true if the solve tag was added to newThread.
function wasSolved(oldThread, newThread, tagId) {
  return (
    !oldThread.appliedTags.includes(tagId) &&
    newThread.appliedTags.includes(tagId)
  );
}

// Returns true if the solve tag was removed from newThread.
function wasUnSolved(oldThread, newThread, tagId) {
  return (
    oldThread.appliedTags.includes(tagId) &&
    !newThread.appliedTags.includes(tagId)
  );
}

// Returns the tagId for the tag named tagName in the given channel
function findTagIdByName(channel, tagName) {
  // Sometimes there are no available tags
  if (!channel.availableTags) {
    return undefined;
  }

  const matchingTags = channel.availableTags.filter((item) => {
    return item.name.toLowerCase() == tagName.toLowerCase();
  });

  return matchingTags.length > 0 ? matchingTags[0].id : undefined;
}

// Returns true if a thread was started farther back in time than
// the number of days specified by the OLD_THREAD_AGE_IN_DAYS environment
// variable.
function isOldThread(thread) {
  const ageCutoffInMs =
    parseInt(process.env.OLD_THREAD_AGE_IN_DAYS) * 24 * 60 * 60 * 1000;

  const threadAgeInMs = Date.now() - thread.createdTimestamp;

  return threadAgeInMs > ageCutoffInMs;
}

module.exports = {
  name: Events.ThreadUpdate,
  async execute(oldThread, newThread) {
    try {
      if (!newThread.manageable) {
        logger.error(
          `No permission to manage thread "${newThread.name}" in channel <#${newThread.parentId}>`,
          {
            thread: newThread.name,
            parent: newThread.parent.name,
            parentId: newThread.parentId,
          }
        );
        return;
      }

      // Get the tagId for "Solved" from the parent channel
      const tagId = findTagIdByName(
        newThread.parent,
        process.env.SOLVED_TAG_NAME
      );

      if (tagId === undefined) {
        // This is debug instead of warn because it's quite common to have no tags, it means the bot was triggered by a thread
        // change in a channel that doesn't have the tags enabled on it.
        logger.debug(
          `Unable to lock thread "${newThread.name}": couldn't find tag name ${process.env.SOLVED_TAG_NAME} in channel <#${newThread.parentId}>.`,
          {
            thread: newThread.name,
            solvedTag: process.env.SOLVED_TAG_NAME,
            parent: newThread.parent.name,
            parentId: newThread.parentId,
          }
        );
        return;
      }

      if (wasSolved(oldThread, newThread, tagId)) {
        if (!isOldThread(newThread)) {
          await newThread.send(
            `Since this is resolved I'm locking the thread. For additional questions or similar issues please start a new thread in <#${newThread.parentId}>. Happy flying!`
          );
        } else {
          const createdDate = new Date(
            newThread.createdTimestamp
          ).toUTCString();
          logger.info(
            `Not sending closed message to "${newThread.name}" in channel <#${newThread.parentId}> since it was created ${createdDate} which is more than ${process.env.OLD_THREAD_AGE_IN_DAYS} days ago.`,
            {
              thread: newThread.name,
              parent: newThread.parent.name,
              parentId: newThread.parentId,
              createdDate,
              oldThreadAge: process.env.OLD_THREAD_AGE_IN_DAYS,
            }
          );
        }

        await newThread.setLocked(true);
        logger.debug(
          `Locked thread "${newThread.name}" in channel <#${newThread.parentId}>`,
          {
            thread: newThread.name,
            parent: newThread.parent.name,
            parentId: newThread.parentId,
          }
        );
      } else if (wasUnSolved(oldThread, newThread, tagId)) {
        await newThread.setLocked(false);
        logger.debug(
          `Unlocked thread "${newThread.name}" in channel <#${newThread.parentId}>`,
          {
            thread: newThread.name,
            parent: newThread.parent.name,
            parentId: newThread.parentId,
          }
        );

        // This will only have a value if the cache contains the last message.
        // for the channel.
        const lastMessage = newThread.lastMessage;
        if (lastMessage?.author.bot) {
          await newThread.lastMessage.delete();
          logger.debug(
            `Deleted the last message from the thread since it came from the bot`
          );
        }
      }
    } catch (error) {
      logger.error(`Error setting thread lock state: ${error.message}`);
    }
  },
};
