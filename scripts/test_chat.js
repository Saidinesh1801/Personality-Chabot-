(async function () {
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // 2-second delay
    const url = process.env.SERVER_URL || 'http://localhost:52738/api/chat';
    // ... existing code ...
    const body = { message: 'what is the time now', personality: 'Friendly' };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
})();
