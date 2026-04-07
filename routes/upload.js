const express = require('express');
const router = express.Router();
const { PDFParse } = require('pdf-parse');
const { pathToFileURL } = require('url');
const path = require('path');
const logger = require('../src/logger');

let AdmZip;
try {
  AdmZip = require('adm-zip');
} catch (_e) {
  /* optional */
}

// Configure pdf-parse worker for Windows compatibility
const pdfWorkerPath = pathToFileURL(
  path.join(path.dirname(require.resolve('pdf-parse')), 'pdf.worker.mjs')
).href;
PDFParse.setWorker(pdfWorkerPath);

router.post('/pdf', async (req, res) => {
  try {
    const { pdf } = req.body;
    if (!pdf) return res.status(400).json({ error: 'No PDF data provided' });

    const match = pdf.match(/^data:application\/pdf;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid PDF format' });

    const buffer = Buffer.from(match[1], 'base64');

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'PDF too large (max 20MB)' });
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (result.text || '').trim();
    const pages = result.total || 0;

    await parser.destroy().catch(() => {});

    if (!text) {
      return res.json({
        text: '',
        pages,
        warning: 'No readable text found in PDF. It may be a scanned document.',
      });
    }

    logger.info('PDF extracted', { pages, chars: text.length });
    res.json({ text, pages });
  } catch (error) {
    logger.error('PDF extraction failed', { error: error.message });
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

router.post('/pptx', async (req, res) => {
  try {
    const { file: fileData } = req.body;
    if (!fileData) return res.status(400).json({ error: 'No file data provided' });

    const match = fileData.match(/^data:[^;]+;base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid file format' });

    const buffer = Buffer.from(match[1], 'base64');

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'File too large (max 20MB)' });
    }

    if (!AdmZip) {
      return res
        .status(500)
        .json({ error: 'PPTX support requires adm-zip package. Run: npm install adm-zip' });
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const slideTexts = [];

    const slideEntries = entries
      .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.match(/slide(\d+)/)[1]);
        const numB = parseInt(b.entryName.match(/slide(\d+)/)[1]);
        return numA - numB;
      });

    for (const entry of slideEntries) {
      const xml = entry.getData().toString('utf8');
      const texts = [];
      const regex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
      let m;
      while ((m = regex.exec(xml)) !== null) {
        if (m[1].trim()) texts.push(m[1]);
      }
      if (texts.length > 0) {
        const slideNum = entry.entryName.match(/slide(\d+)/)[1];
        slideTexts.push(`--- Slide ${slideNum} ---\n${texts.join(' ')}`);
      }
    }

    const text = slideTexts.join('\n\n').trim();
    const slides = slideEntries.length;

    if (!text) {
      return res.json({ text: '', slides, warning: 'No readable text found in presentation.' });
    }

    logger.info('PPTX extracted', { slides, chars: text.length });
    res.json({ text, slides });
  } catch (error) {
    logger.error('PPTX extraction failed', { error: error.message });
    res.status(500).json({ error: 'Failed to extract text from presentation' });
  }
});

module.exports = router;
