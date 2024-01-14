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
  return (
    channel.availableTags.filter((item) => {
      return item.name == tagName;
    })?.[0].id ?? 0
  );
}

module.exports = {
  name: Events.ThreadUpdate,
  async execute(oldThread, newThread) {
    // Get the tagId for "Solved" from the parent channel
    const tagId = findTagIdByName(
      newThread.parent,
      process.env.SOLVED_TAG_NAME
    );

    if (wasSolved(oldThread, newThread, tagId)) {
      await newThread.send(
        `Since this is resolved I'm locking the thread. For additional questions or similar issues please start a new thread in <#${newThread.parentId}>.`
      );
      newThread.setLocked(true);
    } else if (wasUnSolved(oldThread, newThread, tagId)) {
      newThread.setLocked(false);

      // This will only have a value if the cache contains the last message.
      // for the channel.
      const lastMessage = newThread.lastMessage;
      if (lastMessage?.author.bot) {
        await newThread.lastMessage.delete();
      }
    }
  },
};
