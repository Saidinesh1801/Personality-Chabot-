const TEMPLATE_RESPONSES = {
  greeting: [
    "Hello! I'm your AI assistant. How can I help you today?",
    'Hi there! What can I help you with?',
    "Hey! Ready to chat. What's on your mind?",
  ],
  default: [
    "That's an interesting question. Let me think about it...\n\nBased on my knowledge, I'd suggest looking into the core concepts around this topic. You might want to explore the fundamentals first before diving deeper into specific implementations.",
    "Great question! Here's what I can tell you:\n\nThis involves several key principles that work together. The main thing to understand is how the components interact with each other.",
    "I'd be happy to help with that! Here's my understanding:\n\nThis is a multifaceted topic. Let me break it down into digestible parts.",
  ],
  time: "The current time is {time}. Is there something specific you'd like to know about?",
  weather:
    "I'm not currently connected to a weather API, but I'd recommend checking your local weather service for accurate updates. Would you like me to help with something else?",
  help: 'I can help you with a wide range of tasks:\n\n- **Answer questions** on any topic\n- **Generate images** from text descriptions\n- **Write and debug code** in many languages\n- **Analyze documents** (PDF, images, data files)\n- **Search the web** for current information\n- **Have conversations** in different styles\n- **Create summaries** of long content\n\nJust ask!',
};

const TEMPLATE_KEYWORDS = {
  time: ['time', 'clock', 'hour'],
  weather: ['weather', 'temperature', 'rain', 'forecast'],
};

function getTemplateResponse(query) {
  const lower = query.toLowerCase();

  for (const [category, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      const template = TEMPLATE_RESPONSES[category];
      if (category === 'time' && template.includes('{time}')) {
        return template.replace('{time}', new Date().toLocaleTimeString());
      }
      return template;
    }
  }

  for (const greeting of TEMPLATE_RESPONSES.greeting) {
    if (
      greeting
        .toLowerCase()
        .split(' ')
        .some((w) => lower.includes(w))
    ) {
      return greeting;
    }
  }

  return TEMPLATE_RESPONSES.default[Math.floor(Math.random() * TEMPLATE_RESPONSES.default.length)];
}

module.exports = { TEMPLATE_RESPONSES, getTemplateResponse };
