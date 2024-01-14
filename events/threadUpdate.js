const { Events } = require("discord.js");

function wasLocked(oldThread, newThread) {
  return !oldThread.locked && newThread.locked;
}

function wasUnlocked(oldThread, newThread) {
  return oldThread.locked && !newThread.locked;
}

function wasSolved(oldThread, newThread) {
  return (
    !oldThread.appliedTags.includes(process.env.SOLVED_TAG_ID) &&
    newThread.appliedTags.includes(process.env.SOLVED_TAG_ID)
  );
}

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
      console.log(`${newThread.name} is solved`);
    } else if (wasUnSolved(oldThread, newThread)) {
      console.log(`${newThread.name} isn't solved anymore`);
    }
  },
};
