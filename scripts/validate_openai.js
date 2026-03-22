(async ()=>{
  try {
    require('dotenv').config();
    const OpenAI = require('openai');
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error('NO_KEY');
      process.exit(2);
    }
    const client = new OpenAI({ apiKey: key });
    console.log('Using key prefix:', key.slice(0,6));
    // Call embeddings endpoint as a lightweight validation
    const resp = await client.embeddings.create({ model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: ['hello world'] });
    if (resp && resp.data && resp.data[0] && resp.data[0].embedding) {
      console.log('EMBED_OK length=', resp.data[0].embedding.length);
      process.exit(0);
    }
    console.error('NO_EMBED');
    process.exit(3);
  } catch (err) {
    console.error('ERR', err && err.message);
    if (err && err.response && err.response.status) console.error('STATUS', err.response.status);
    process.exit(4);
  }
})();
