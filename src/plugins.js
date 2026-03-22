const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', 'plugins');

const registeredPlugins = new Map();

function registerPlugin(id, plugin) {
  if (!id || typeof id !== 'string') {
    throw new Error('Plugin ID must be a non-empty string');
  }
  if (registeredPlugins.has(id)) {
    console.warn(`[Plugins] Plugin "${id}" already registered, overwriting.`);
  }
  if (!plugin || typeof plugin.name !== 'string' || typeof plugin.execute !== 'function') {
    throw new Error(`Plugin "${id}" must have name (string) and execute (function) properties`);
  }
  registeredPlugins.set(id, {
    id,
    name: plugin.name,
    description: plugin.description || '',
    version: plugin.version || '1.0.0',
    execute: plugin.execute,
    triggers: Array.isArray(plugin.triggers) ? plugin.triggers : [],
    author: plugin.author || 'Unknown',
  });
  console.log(`[Plugins] Registered: ${id} v${plugin.version || '1.0.0'}`);
  return id;
}

function unregisterPlugin(id) {
  const removed = registeredPlugins.delete(id);
  if (removed) {
    console.log(`[Plugins] Unregistered: ${id}`);
  }
  return removed;
}

function getPlugin(id) {
  return registeredPlugins.get(id) || null;
}

function listPlugins() {
  return Array.from(registeredPlugins.values()).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    version: p.version,
    author: p.author,
  }));
}

function getAllTriggers() {
  const triggers = {};
  for (const [id, plugin] of registeredPlugins) {
    for (const trigger of plugin.triggers) {
      if (!triggers[trigger]) triggers[trigger] = [];
      triggers[trigger].push(id);
    }
  }
  return triggers;
}

async function executePlugin(id, params, context = {}) {
  const plugin = registeredPlugins.get(id);
  if (!plugin) return { error: `Plugin "${id}" not found` };
  try {
    const result = await plugin.execute(params, context);
    return { success: true, result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function matchAndExecute(message, context = {}) {
  const lower = message.toLowerCase();
  const results = [];
  const triggers = getAllTriggers();

  for (const [trigger, pluginIds] of Object.entries(triggers)) {
    if (lower.includes(trigger)) {
      for (const id of pluginIds) {
        const result = await executePlugin(id, { message, trigger }, context);
        if (result.success && result.result) {
          results.push({ pluginId: id, result: result.result });
        }
      }
    }
  }

  return results;
}

function loadPluginsFromDir() {
  if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    const readme = `# Plugins Directory

Place custom plugins here. Each plugin should export:
- \`name\` (string) - Display name
- \`description\` (string) - What it does
- \`version\` (string) - Version
- \`author\` (string) - Author
- \`triggers\` (string[]) - Keywords that trigger this plugin
- \`execute(params, context)\` (async function) - Main function

Example plugin (plugins/example.js):
\`\`\`js
module.exports = {
  name: 'Calculator',
  description: 'Evaluate math expressions',
  version: '1.0.0',
  author: 'You',
  triggers: ['calculate', 'compute', 'what is', 'solve'],
  async execute({ message }) {
    const match = message.match(/[\\d+\\-*/().]+/);
    if (!match) return null;
    try {
      const result = eval(match[0]);
      return { answer: result };
    } catch {
      return { answer: 'Could not evaluate' };
    }
  }
};
\`\`\`
`;
    fs.writeFileSync(path.join(PLUGINS_DIR, 'README.md'), readme);
    return;
  }

  const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const plugin = require(path.join(PLUGINS_DIR, file));
      const id = path.basename(file, '.js');
      registerPlugin(id, plugin);
    } catch (err) {
      console.error(`[Plugins] Failed to load ${file}:`, err.message);
    }
  }
}

function registerBuiltInPlugins() {
  registerPlugin('wikipedia', {
    name: 'Wikipedia Lookup',
    description: 'Fetch information from Wikipedia',
    version: '1.0.0',
    author: 'Built-in',
    triggers: ['who is', 'what is', 'tell me about', 'when was', 'where is', 'history of'],
    async execute({ message }, { llm }) {
      if (llm) {
        const result = await llm(message, null, [], 'You are a Wikipedia search assistant. Return only the Wikipedia summary in 2-3 sentences, with a URL.', {});
        return { text: result?.text || null, source: 'Wikipedia' };
      }
      return { text: null };
    },
  });

  registerPlugin('calculator', {
    name: 'Calculator',
    description: 'Evaluate mathematical expressions',
    version: '1.0.0',
    author: 'Built-in',
    triggers: ['calculate', 'compute', 'what is', 'solve', 'evaluate', 'sum of', 'product of'],
    async execute({ message }) {
      const expr = message.match(/(-?\d+\.?\d*)\s*([+\-*/^])\s*(-?\d+\.?\d*)/);
      if (!expr) return { text: null };
      try {
        let result;
        const a = parseFloat(expr[1]);
        const op = expr[2];
        const b = parseFloat(expr[3]);
        switch (op) {
          case '+': result = a + b; break;
          case '-': result = a - b; break;
          case '*': result = a * b; break;
          case '/': result = b !== 0 ? a / b : 'undefined (division by zero)'; break;
          case '^': result = Math.pow(a, b); break;
        }
        return { text: `${a} ${op} ${b} = ${result}` };
      } catch {
        return { text: null };
      }
    },
  });

  registerPlugin('reminder', {
    name: 'Reminder',
    description: 'Set reminders and timers',
    version: '1.0.0',
    author: 'Built-in',
    triggers: ['remind me', 'set a reminder', 'in ', 'minutes', 'hours from now', 'alarm'],
    async execute({ message }) {
      const inMinutes = message.match(/in\s+(\d+)\s+(minute|minutes|hour|hours|second|seconds)/i);
      const atTime = message.match(/at\s+(\d{1,2}:\d{2})/);
      if (inMinutes) {
        const amount = parseInt(inMinutes[1]);
        const unit = inMinutes[2].toLowerCase();
        const ms = unit.startsWith('hour') ? amount * 3600000 : unit.startsWith('minute') ? amount * 60000 : amount * 1000;
        return { text: `Reminder set for ${amount} ${unit} from now.`, delay: ms };
      }
      return { text: null };
    },
  });

  registerPlugin('weather', {
    name: 'Weather Info',
    description: 'Get weather information for a location',
    version: '1.1.0',
    author: 'Built-in',
    triggers: ['weather in', 'weather at', "what's the weather", 'what is the weather', 'temperature in', 'forecast for', 'is it raining', 'will it rain', 'how is the weather', 'weather like'],
    async execute({ message }) {
      const cityMatch = message.match(/weather\s+(?:in|at|for)\s+([A-Za-z\s]+?)(?:\?|$|\.|,)/i)
        || message.match(/temperature\s+(?:in|at|for)\s+([A-Za-z\s]+?)(?:\?|$|\.)/i)
        || message.match(/(?:rain(?:ing|s)?|forecast)\s+(?:in|at|for)\s+([A-Za-z\s]+?)(?:\?|$|\.)/i)
        || message.match(/what(?:'s| is) the weather (?:in|at|for)?\s*([A-Za-z\s]+?)(?:\?|$|\.)/i);
      if (!cityMatch) return { text: null };
      const city = cityMatch[1].trim();
      if (city.length < 2 || city.length > 100) return { text: null };

      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        if (!geoRes.ok) throw new Error('Geocoding failed');
        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
          return { text: `I couldn't find a location matching "${city}". Try a more specific city name.` };
        }
        const { latitude, longitude, name, country, country_code } = geoData.results[0];

        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
          `&timezone=auto&forecast_days=3&temperature_unit=fahrenheit`
        );
        if (!weatherRes.ok) throw new Error('Weather fetch failed');
        const w = await weatherRes.json();

        const current = w.current;
        const daily = w.daily;

        const wmo = current.weather_code;
        const condition = getWeatherCondition(wmo);
        const humidity = current.relative_humidity_2m;
        const feelsLike = current.apparent_temperature;
        const wind = current.wind_speed_10m;
        const precip = current.precipitation;

        const location = country_code
          ? `${name}, ${country} (${country_code.toUpperCase()})`
          : `${name}, ${country || 'Unknown'}`;

        let forecast = '';
        if (daily && daily.time && daily.time.length > 1) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const today = new Date().getDay();
          const parts = [];
          for (let i = 1; i < Math.min(daily.time.length, 4); i++) {
            const d = new Date(daily.time[i] + 'T12:00:00');
            const dayName = days[(today + i) % 7];
            const code = daily.weather_code[i];
            const max = Math.round(daily.temperature_2m_max[i]);
            const min = Math.round(daily.temperature_2m_min[i]);
            const prob = daily.precipitation_probability_max[i];
            const cond = getWeatherCondition(code);
            parts.push(`**${dayName}**: ${cond}, ${min}–${max}°F (${prob > 20 ? prob + '% rain chance' : 'low rain chance'})`);
          }
          forecast = '\n\n**3-Day Forecast:**\n' + parts.join('\n');
        }

        const rainInfo = precip > 0 ? `\n\nCurrently **raining** (${precip}mm precipitation).` : precip === 0 ? '\n\nNo precipitation right now.' : '';

        return {
          text: `## Weather in ${location}\n\n**Currently**: ${condition}\n**Temperature**: ${Math.round(current.temperature_2m)}°F (feels like ${Math.round(feelsLike)}°F)\n**Humidity**: ${humidity}%\n**Wind**: ${Math.round(wind)} km/h${rainInfo}${forecast}`,
        };
      } catch (err) {
        console.error('[Weather Plugin] Error:', err.message);
        return { text: `Couldn't fetch weather for "${city}". Please try again.` };
      }
    },
  });

  function getWeatherCondition(code) {
    if (code === 0) return 'Clear sky';
    if (code <= 3) return 'Partly cloudy';
    if (code <= 49) return 'Foggy';
    if (code <= 59) return 'Drizzle';
    if (code <= 69) return 'Rain';
    if (code <= 79) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 86) return 'Snow showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  }
}

module.exports = {
  registerPlugin,
  unregisterPlugin,
  getPlugin,
  listPlugins,
  executePlugin,
  matchAndExecute,
  loadPluginsFromDir,
  registerBuiltInPlugins,
  registeredPlugins,
};
