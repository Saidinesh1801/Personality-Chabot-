async function callTool(message) {
  const lower = message.toLowerCase().trim();
  if (lower === 'what is the time now' || lower === 'current time' || lower === 'what time is it') {
    return new Date().toLocaleTimeString();
  }
  return null;
}

module.exports = { callTool };
