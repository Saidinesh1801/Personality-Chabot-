const vm = require('vm');

const JS_TIMEOUT = 5000;
const MAX_OUTPUT_LINES = 50;

function runJavaScript(code) {
  const logs = [];
  const sandbox = {
    console: {
      log: (...args) => {
        if (logs.length < MAX_OUTPUT_LINES) logs.push(args.map(String).join(' '));
      },
      error: (...args) => {
        if (logs.length < MAX_OUTPUT_LINES) logs.push('Error: ' + args.map(String).join(' '));
      },
      warn: (...args) => {
        if (logs.length < MAX_OUTPUT_LINES) logs.push('Warning: ' + args.map(String).join(' '));
      },
      info: (...args) => {
        if (logs.length < MAX_OUTPUT_LINES) logs.push(args.map(String).join(' '));
      },
    },
    Math,
    Date,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Promise,
    setTimeout: undefined,
    setInterval: undefined,
    fetch: undefined,
    require: undefined,
    process: undefined,
    Buffer: undefined,
    __dirname: undefined,
    __filename: undefined,
  };

  try {
    const script = new vm.Script(code, { timeout: JS_TIMEOUT });
    const context = vm.createContext(sandbox);
    script.runInContext(context, { timeout: JS_TIMEOUT });

    const output = logs.join('\n') || '(no output)';
    return { success: true, output };
  } catch (err) {
    return {
      success: false,
      output: `Error: ${err.message}\n${err.stack ? err.stack.split('\n').slice(1, 3).join('\n') : ''}`,
    };
  }
}

function extractCodeBlocks(text) {
  const blocks = [];
  const regex = /```(?:javascript|js)\n([\s\S]*?)```/gi;
  let m;
  while ((m = regex.exec(text)) !== null) {
    blocks.push(m[1].trim());
  }
  if (blocks.length === 0) {
    const singleLine = /`([^`\n]+)`/g;
    const parts = text.split(singleLine);
    if (parts.length > 1) {
      for (const part of parts) {
        if ((!part.match(/^[a-z]+$/i) && part.includes('=')) || part.includes('function')) {
          blocks.push(part.trim());
        }
      }
    }
  }
  return blocks;
}

function processCodeBlocks(text) {
  const blocks = extractCodeBlocks(text);
  if (blocks.length === 0) return text;

  const results = [];
  for (const block of blocks) {
    results.push(runJavaScript(block));
  }

  const resultSections = results
    .map((r, i) => {
      const label = `// Code block ${i + 1} output:\n${r.output}`;
      return r.success
        ? `<pre class="code-output success">${label}</pre>`
        : `<pre class="code-output error">${label}</pre>`;
    })
    .join('\n');

  return (
    text +
    '\n\n<details class="code-execution"><summary>Run code (' +
    blocks.length +
    ' block' +
    (blocks.length > 1 ? 's' : '') +
    ')</summary>\n' +
    resultSections +
    '\n</details>'
  );
}

module.exports = { runJavaScript, extractCodeBlocks, processCodeBlocks };
