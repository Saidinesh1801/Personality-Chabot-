const express = require('express');
const router = express.Router();
const { generateImage } = require('../src/imagegen');

router.post('/generate', async (req, res) => {
  const { prompt, style } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  try {
    const imageData = await generateImage(prompt, style);
    if (imageData) {
      res.json({ success: true, image: imageData });
    } else {
      res
        .status(503)
        .json({
          error:
            'No image generation provider configured. Set OPENAI_API_KEY or LEONARDO_API_KEY in .env',
        });
    }
  } catch (_err) {
    res.status(500).json({ error: 'Image generation failed' });
  }
});

module.exports = router;
