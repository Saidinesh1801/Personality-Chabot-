// Reusable dialogue patterns for casual conversation, transitions, and exits.

const smallTalkStarters = [
  "How's your day going?",
  "What's on your playlist lately?",
  "Tried any new coffee spots recently?",
  "Feeling like chatting about music or vibes?",
  "Got any favorite songs stuck in your head?",
];

const exitPhrases = [
  "Well, if you need anything else, just holler!",
  "I'm here whenever you want to talk more.",
  "Catch you later — keep those good vibes flowing!",
  "Let's pick this up another time, cool?",
];

const followUpQuestions = [
  "What genre are you in the mood for today?",
  "Want a recommendation based on a specific coffee shop vibe?",
  "Anything special you're celebrating or winding down from?",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  smallTalkStarters,
  exitPhrases,
  followUpQuestions,
  randomItem,
};
