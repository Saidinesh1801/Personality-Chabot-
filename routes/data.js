const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return null;

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        const val = values[idx];
        row[h] = isNaN(val) ? val : parseFloat(val);
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function analyzeData(data) {
  const { headers, rows } = data;
  const numericCols = headers.filter((h) => typeof rows[0]?.[h] === 'number');
  const categoricalCols = headers.filter((h) => typeof rows[0]?.[h] === 'string');

  const stats = {};
  numericCols.forEach((col) => {
    const values = rows.map((r) => r[col]).filter((v) => typeof v === 'number');
    if (values.length > 0) {
      const sum = values.reduce((a, b) => a + b, 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const mean = sum / values.length;
      stats[col] = {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        mean: Math.round(mean * 100) / 100,
        count: values.length,
      };
    }
  });

  const categories = {};
  categoricalCols.forEach((col) => {
    const counts = {};
    rows.forEach((r) => {
      const val = r[col];
      counts[val] = (counts[val] || 0) + 1;
    });
    categories[col] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  });

  return { rowCount: rows.length, numericStats: stats, categoricalCounts: categories };
}

router.post('/analyze', async (req, res) => {
  try {
    const { csv, filename } = req.body;
    if (!csv) return res.status(400).json({ error: 'No CSV data provided' });

    const match = csv.match(/^data:text\/csv;base64,(.+)$/);
    let text;
    if (match) {
      text = Buffer.from(match[1], 'base64').toString('utf8');
    } else if (
      csv.startsWith('data:application/vnd.ms-excel') ||
      csv.startsWith('data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ) {
      return res.status(400).json({ error: 'Excel files not supported. Please convert to CSV.' });
    } else {
      text = csv;
    }

    const data = parseCSV(text);
    if (!data || data.rows.length === 0) {
      return res.status(400).json({ error: 'Could not parse CSV data' });
    }

    const analysis = analyzeData(data);

    const summary =
      `## Data Analysis: ${filename || 'upload.csv'}\n\n` +
      `**Total Rows:** ${analysis.rowCount}\n**Total Columns:** ${data.headers.length}\n\n` +
      `### Numeric Columns\n${Object.entries(analysis.numericStats)
        .map(
          ([k, v]) => `- **${k}**: min=${v.min}, max=${v.max}, mean=${v.mean} (${v.count} values)`
        )
        .join('\n')}\n\n` +
      `### Categorical Columns\n${Object.entries(analysis.categoricalCounts)
        .map(
          ([k, v]) =>
            `- **${k}**: ${v
              .slice(0, 5)
              .map(([name, count]) => `${name} (${count})`)
              .join(', ')}`
        )
        .join('\n')}`;

    res.json({
      success: true,
      summary,
      analysis,
      headers: data.headers,
      sampleRows: data.rows.slice(0, 5),
    });
  } catch (err) {
    console.error('[Data Analysis] Error:', err.message);
    res.status(500).json({ error: 'Failed to analyze data' });
  }
});

module.exports = router;
