#!/usr/bin/env node

// Test script to verify Gemini LLM integration

const http = require('http');

const tests = [
  {
    name: 'Test 1: Simple greeting',
    message: 'Hello',
    personality: 'Friendly',
  },
  {
    name: 'Test 2: Known KB question',
    message: 'What is Python?',
    personality: 'Friendly',
  },
  {
    name: 'Test 3: General LLM question (Gemini)',
    message: 'What are the benefits of meditation?',
    personality: 'Friendly',
  },
  {
    name: 'Test 4: Complex LLM question',
    message: 'Explain quantum computing in simple terms',
    personality: 'Enthusiastic',
  },
  {
    name: 'Test 5: Current events',
    message: 'Tell me about the latest space exploration missions',
    personality: 'Formal',
  },
];

async function runTest(test) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      message: test.message,
      personality: test.personality,
    });

    const options = {
      hostname: 'localhost',
      port: 52738,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log(`✓ ${test.name}`);
          console.log(`  Q: ${test.message}`);
          console.log(
            `  A: ${result.reply.substring(0, 200)}${result.reply.length > 200 ? '...' : ''}`
          );
          console.log('');
        } catch (e) {
          console.log(`✗ ${test.name}: Parse error`);
          console.log(`  Response: ${data}`);
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`✗ ${test.name}: Connection error - ${e.message}`);
      console.log('  Make sure server is running on port 52738\n');
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function runAllTests() {
  console.log('═'.repeat(70));
  console.log('PERSONALITY CHATBOT - GEMINI LLM INTEGRATION TEST');
  console.log('═'.repeat(70));
  console.log('');

  for (const test of tests) {
    await new Promise((r) => setTimeout(r, 1500)); // Wait between requests
    await runTest(test);
  }

  console.log('═'.repeat(70));
  console.log('All tests completed!');
  console.log('');
  console.log('If all responses above show answers, Gemini LLM is working! ✓');
  console.log('═'.repeat(70));
}

runAllTests().catch(console.error);
