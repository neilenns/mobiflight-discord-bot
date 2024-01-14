const { Events } = require("discord.js");

// Returns true if the solve tag was added to newThread.
function wasSolved(oldThread, newThread) {
  return (
    !oldThread.appliedTags.includes(process.env.SOLVED_TAG_ID) &&
    newThread.appliedTags.includes(process.env.SOLVED_TAG_ID)
  );
}

// Returns true if the solve tag was removed from newThread.
function wasUnSolved(oldThread, newThread) {
  return (
    oldThread.appliedTags.includes(process.env.SOLVED_TAG_ID) &&
    !newThread.appliedTags.includes(process.env.SOLVED_TAG_ID)
  );
}

module.exports = {
  name: Events.ThreadUpdate,
  async execute(oldThread, newThread) {
    if (wasSolved(oldThread, newThread)) {
      await newThread.send(
        `Since this is resolved I'm locking the thread. For additional questions or similar issues please start a new thread in <#${newThread.parentId}>.`
      );
      newThread.setLocked(true);
    } else if (wasUnSolved(oldThread, newThread)) {
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
