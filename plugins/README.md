# Plugins Directory

Place custom plugins here. Each plugin should export:

- `name` (string) - Display name
- `description` (string) - What it does
- `version` (string) - Version
- `author` (string) - Author
- `triggers` (string[]) - Keywords that trigger this plugin
- `execute(params, context)` (async function) - Main function

Example plugin (plugins/example.js):

```js
module.exports = {
  name: 'Calculator',
  description: 'Evaluate math expressions',
  version: '1.0.0',
  author: 'You',
  triggers: ['calculate', 'compute', 'what is', 'solve'],
  async execute({ message }) {
    const match = message.match(/[\d+\-*/().]+/);
    if (!match) return null;
    try {
      const result = eval(match[0]);
      return { answer: result };
    } catch {
      return { answer: 'Could not evaluate' };
    }
  },
};
```
