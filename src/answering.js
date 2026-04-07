/**
 * @file Answer generation module - combines RAG, tools, personalities, and safety checks
 * @module src/answering
 */

const { loadKB, normalize, findInKB } = require('./kb');
const { applyPersonality, getPersonalityPrompt } = require('./personalities');
const { callTool } = require('./tools');
const { checkSafety, applyHumorGuardrail, enhanceMusicResponse } = require('./safety');

const kbMap = loadKB();

const { hasLLM: checkHasLLM } = require('./llm');

let generateAnswerFn = null;

function setGenerateAnswer(fn) {
  generateAnswerFn = fn;
}

async function askLLM(query, history, personalityPrompt, options = {}, context = null) {
  if (!generateAnswerFn) return null;
  try {
    return await generateAnswerFn(query, context, history, personalityPrompt, options);
  } catch (err) {
    console.error('[Answering] LLM error:', err.message);
    return null;
  }
}

// simple token-based relevance scoring (fraction of query words found in response)
function scoreResponse(query, response) {
  if (!query || !response) return 0;
  const qWords = query.toLowerCase().match(/\b\w+\b/g) || [];
  const rWords = response.toLowerCase().match(/\b\w+\b/g) || [];
  const setR = new Set(rWords);
  let matches = 0;
  qWords.forEach((w) => {
    if (setR.has(w)) matches++;
  });
  return qWords.length > 0 ? matches / qWords.length : 0;
}

// determine if user is asking for a prediction/opinion
function isSpeculative(message) {
  const low = (message || '').toLowerCase();
  // look for modal verbs combined with future-oriented keywords
  return (
    /\b(?:think|would|could|might|should|predict)\b/.test(low) &&
    /\b(win|happen|occur|likely)\b/.test(low)
  );
}

async function findAnswer(message, history, personality, options = {}) {
  const lowerMsg = normalize(message);

  // safety pre-check: steer away from sensitive topic before calling LLM
  const safetyMsg = checkSafety(message);
  if (safetyMsg) {
    return { text: safetyMsg, source: null, score: 0 };
  }

  let personalityPrompt = getPersonalityPrompt(personality);

  if (options.memoryHint) {
    personalityPrompt += '\n\n' + options.memoryHint;
  }

  // if question is speculative, remind the model to answer as opinion/prediction
  if (isSpeculative(message)) {
    personalityPrompt +=
      "\n\nIMPORTANT: The user is asking for a prediction or your opinion about a future event. Do NOT state that the event has already happened; make it clear you are hypothesizing or that you don't have real-time results.\n";
  }

  // Apply mode-specific system prompt modifications
  const modePrompts = {
    'web-search':
      '\n\nIMPORTANT: The user wants you to search the web for current information. Provide up-to-date, factual answers with sources when possible.',
    thinking:
      '\n\nIMPORTANT: Think step-by-step through this problem. Show your reasoning process clearly. Break down complex problems into smaller parts. Consider multiple angles before giving your final answer.',
    'deep-research':
      '\n\nIMPORTANT: Provide an extremely thorough and comprehensive answer. Cover all aspects of the topic in depth. Include background, details, examples, pros/cons, and cite sources. This should be a detailed research-quality response.',
    study:
      '\n\nIMPORTANT: You are in Study & Learn mode. Explain concepts clearly as a teacher would. Use simple language, analogies, and examples. Break down complex topics into digestible parts. Add key takeaways and suggest further reading.',
    quiz: "\n\nIMPORTANT: Generate a quiz based on the user's topic. Create 5 multiple-choice questions with 4 options each (A, B, C, D). Mark the correct answer. Add a brief explanation for each correct answer. Format it clearly with markdown.",
  };

  if (options.mode && modePrompts[options.mode]) {
    personalityPrompt += modePrompts[options.mode];
  }

  // Simple greetings — use KB for instant response
  const greetings = ['hello', 'hi', 'hey', 'bye', 'goodbye', 'thanks', 'thank you', 'see you'];
  if (greetings.includes(lowerMsg)) {
    const kbResult = findInKB(message, kbMap);
    if (kbResult) return { text: kbResult, source: null, score: 1 };
  }

  // For everything else, use LLM as the primary brain
  const llmAvailable = checkHasLLM();
  console.log('[Answering] checkHasLLM():', llmAvailable);

  if (llmAvailable) {
    // Try RAG-augmented answer first
    const ragResults = await retrieveRAG(message, 3);
    if (ragResults.length > 0 && ragResults[0].score >= 0.5) {
      const context = ragResults
        .filter((p) => p.score >= 0.5)
        .map((p, i) => `[Passage ${i + 1}] ${p.text}`)
        .join('\n\n');
      const ragLLM = await askLLM(message, history, personalityPrompt, options, context);
      if (ragLLM && ragLLM.text && ragLLM.text.trim()) {
        const source = ragResults[0].metadata?.url || null;
        const score = scoreResponse(message, ragLLM.text);
        return { text: ragLLM.text, source, score };
      }
    }

    // Fall back to plain LLM call
    const llmResult = await askLLM(message, history, personalityPrompt, options);
    if (llmResult && llmResult.text && llmResult.text.trim()) {
      const score = scoreResponse(message, llmResult.text);
      return { text: llmResult.text, source: null, score };
    }
    // LLM was available but failed — try KB as fallback
    const kbFallback = findInKB(message, kbMap);
    if (kbFallback) return { text: kbFallback, source: null, score: 0.5 };
    return {
      text: "Sorry, I couldn't get a response right now. The AI service may be busy — please try again in a moment.",
      source: null,
      score: 0,
    };
  }

  // No LLM available — use KB exact match only
  const kbExact = kbMap.get(lowerMsg);
  if (kbExact) return { text: kbExact, source: null };

  return {
    text: 'No AI provider is configured. Please set GEMINI_API_KEY in your .env file.',
    source: null,
  };
}

async function generateReply(message, personality, history, options = {}) {
  const toolResult = await callTool(message);
  if (toolResult) {
    return applyPersonality(toolResult, personality);
  }

  // manage short-term memory if caller supplies a memory object
  if (options.memory) {
    const { updateMemory } = require('./memory');
    updateMemory(options.memory, message);
  }

  // if memory exists, we may want to inject a brief summary into prompt
  if (options.memory) {
    const { formatMemory } = require('./memory');
    options.memoryHint = formatMemory(options.memory);
  }

  const answer = await findAnswer(message, history, personality, options);
  let text = '';
  let src = null;
  if (!answer) {
    text = "I'm not sure about that.";
  } else if (typeof answer === 'string') {
    text = answer;
  } else if (answer.text) {
    text = answer.text;
    src = answer.source || null;
  } else {
    text = String(answer);
  }
  const sourceSuffix = src ? ` (Source: ${src})` : '';

  let reply = text + sourceSuffix;

  // apply humor guardrail to the generated reply
  reply = applyHumorGuardrail(reply);

  // readability check: if complex, offer simplification
  const { readabilityGrade } = require('./safety');
  const grade = readabilityGrade(reply);
  if (grade > 8) {
    reply += '\n\n_(This explanation might be a bit complex; feel free to ask me to simplify it.)_';
  }

  // actionable music outputs when appropriate
  reply = enhanceMusicResponse(message, reply);

  return applyPersonality(reply, personality);
}

// Build the full personality prompt for streaming (includes mode, memory, speculative hints)
function buildFullPrompt(message, personality, options = {}) {
  let personalityPrompt = getPersonalityPrompt(personality);
  if (options.memoryHint) personalityPrompt += '\n\n' + options.memoryHint;
  if (isSpeculative(message)) {
    personalityPrompt +=
      "\n\nIMPORTANT: The user is asking for a prediction or your opinion about a future event. Do NOT state that the event has already happened; make it clear you are hypothesizing or that you don't have real-time results.\n";
  }
  const modePrompts = {
    'web-search':
      '\n\nIMPORTANT: The user wants you to search the web for current information. Provide up-to-date, factual answers with sources when possible.',
    thinking:
      '\n\nIMPORTANT: Think step-by-step through this problem. Show your reasoning process clearly. Break down complex problems into smaller parts. Consider multiple angles before giving your final answer.',
    'deep-research':
      '\n\nIMPORTANT: Provide an extremely thorough and comprehensive answer. Cover all aspects of the topic in depth. Include background, details, examples, pros/cons, and cite sources. This should be a detailed research-quality response.',
    study:
      '\n\nIMPORTANT: You are in Study & Learn mode. Explain concepts clearly as a teacher would. Use simple language, analogies, and examples. Break down complex topics into digestible parts. Add key takeaways and suggest further reading.',
    quiz: "\n\nIMPORTANT: Generate a quiz based on the user's topic. Create 5 multiple-choice questions with 4 options each (A, B, C, D). Mark the correct answer. Add a brief explanation for each correct answer. Format it clearly with markdown.",
  };
  if (options.mode && modePrompts[options.mode]) personalityPrompt += modePrompts[options.mode];
  if (options.pdfContext) {
    personalityPrompt +=
      "\n\nIMPORTANT: The user has uploaded a PDF document. The extracted text from the PDF is provided as context. Answer the user's question based on the PDF content. Reference specific sections, pages, or information from the document. Be thorough and accurate in your analysis of the document content.";
  }
  return personalityPrompt;
}

module.exports = { generateReply, setGenerateAnswer, buildFullPrompt };
