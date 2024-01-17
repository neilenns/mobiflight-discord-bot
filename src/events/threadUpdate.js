const { Events } = require("discord.js");

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
  const matchingTags = channel.availableTags.filter((item) => {
    return item.name.toLowerCase() == tagName.toLowerCase();
  });

  return matchingTags.length > 0 ? matchingTags[0].id : 0;
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
        console.log(`No permission to manage thread "${newThread.name}"`);
        return;
      }

      // Get the tagId for "Solved" from the parent channel
      const tagId = findTagIdByName(
        newThread.parent,
        process.env.SOLVED_TAG_NAME
      );

      if (wasSolved(oldThread, newThread, tagId)) {
        if (!isOldThread(newThread)) {
          await newThread.send(
            `Since this is resolved I'm locking the thread. For additional questions or similar issues please start a new thread in <#${newThread.parentId}>. Happy flying!`
          );
        }

        await newThread.setLocked(true);
        console.log(`Locked thread "${newThread.name}"`);
      } else if (wasUnSolved(oldThread, newThread, tagId)) {
        await newThread.setLocked(false);
        console.log(`Unlocked thread "${newThread.name}"`);

        // This will only have a value if the cache contains the last message.
        // for the channel.
        const lastMessage = newThread.lastMessage;
        if (lastMessage?.author.bot) {
          await newThread.lastMessage.delete();
        }
      }
    } catch (error) {
      console.log(`Error setting thread lock state: ${error.message}`);
    }
  },
};
