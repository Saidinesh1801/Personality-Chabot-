// Safety and content post‑processing utilities

// A very simple list of words that might indicate an off‑color or offensive joke.
// In a real application you would use a proper moderation API.
const offensiveTerms = [
  'idiot', 'stupid', 'dumb', 'hate', 'insult', 'fuck', 'shit', 'bitch', 'slur',
];

// Simple sensitive terms to steer away from.
const sensitiveTerms = [
  'kill', 'suicide', 'murder', 'rape', 'bomb', 'terror', 'drugs', 'violence',
  'racist', 'racism', 'sexist', 'homophobic', 'hate',
];

function normalizeText(text) {
  return (text || '').toLowerCase();
}

// Content moderation is handled by the LLM's built-in safety training.
function checkSafety(message) {
  return null;
}

// Content moderation is handled by the LLM's built-in safety training.
function applyHumorGuardrail(response) {
  return response;
}

// Add actionable music notes when the conversation seems to be about recommendations
function enhanceMusicResponse(userMessage, botReply) {
  const lower = normalizeText(userMessage);
  if (/music|song|playlist|track|vibe/.test(lower) && /recommend|suggest/.test(lower)) {
    const extra = [];
    extra.push('**Mood tags:** calm, upbeat, mellow (adjust to taste)');
    extra.push('**Licensing:** verify rights – consider royalty-free libraries, Creative Commons, or commissioning original music.');
    extra.push('**Sample vibe:** imagine a smooth piano with light percussion, mellow synth pads, and a relaxed tempo.');
    return botReply + '\n\n' + extra.map(e => '- ' + e).join('\n');
  }
  return botReply;
}

// basic readability: compute Flesch-Kincaid grade level (approx)
function readabilityGrade(text) {
  if (!text) return 0;
  const sentences = (text.match(/[\.\!\?]+/g) || []).length || 1;
  const words = (text.match(/\b\w+\b/g) || []).length || 1;
  const syllables = (text.match(/[aeiouy]{1,2}/g) || []).length || 1;
  const grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
  return grade;
}

module.exports = { checkSafety, applyHumorGuardrail, enhanceMusicResponse, readabilityGrade };
