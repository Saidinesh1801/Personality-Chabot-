/**
 * Simple logger with different severity levels
 */
const LOG_LEVEL = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

const CURRENT_LEVEL = process.env.LOG_LEVEL || 'INFO';

const levels = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
const currentLevelIndex = levels.indexOf(CURRENT_LEVEL);

function shouldLog(level) {
  return levels.indexOf(level) <= currentLevelIndex;
}

function formatTime() {
  return new Date().toISOString();
}

function log(level, message, data = null) {
  if (!shouldLog(level)) return;

  const timestamp = formatTime();
  const prefix = `[${timestamp}] ${level}`;
  
  if (data) {
    console.log(`${prefix}:`, message, data);
  } else {
    console.log(`${prefix}:`, message);
  }
}

module.exports = {
  error: (msg, data) => log('ERROR', msg, data),
  warn: (msg, data) => log('WARN', msg, data),
  info: (msg, data) => log('INFO', msg, data),
  debug: (msg, data) => log('DEBUG', msg, data),
  LOG_LEVEL
};
