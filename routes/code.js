const express = require('express');
const router = express.Router();

router.post('/execute', (req, res) => {
  const { code, language } = req.body;
  if (!code) return res.status(400).json({ error: 'code is required' });
  if (language && language !== 'javascript' && language !== 'js') {
    return res.status(400).json({ error: 'Only JavaScript execution is supported' });
  }
  const vm = require('vm');
  const sandbox = {
    console: {
      log: (...a) => '[LOG] ' + a.join(' '),
      error: (...a) => '[ERROR] ' + a.join(' '),
      warn: (...a) => '[WARN] ' + a.join(' '),
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
  };
  try {
    const script = new vm.Script(code);
    const ctx = vm.createContext(sandbox);
    script.runInContext(ctx, { timeout: 5000 });
    res.json({ success: true, output: sandbox._output || '(no output)' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
