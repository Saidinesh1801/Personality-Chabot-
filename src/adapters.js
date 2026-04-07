const externalKB = {};
const externalKB_sources = {};

async function fetchWikipediaSummary(topic) {
  if (!topic || topic.trim().length === 0) return null;
  const key = topic.toLowerCase().trim();
  if (externalKB[key]) return externalKB[key];
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PersonalityChatbot/1.0 (https://localhost)' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.extract) {
      externalKB[key] = data.extract;
      externalKB_sources[key] =
        data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page
          ? data.content_urls.desktop.page
          : `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`;
      return data.extract;
    }
  } catch (err) {
    console.error('fetchWikipediaSummary error:', err && err.message);
  }
  return null;
}

async function fetchWikipediaWithSource(topic) {
  const txt = await fetchWikipediaSummary(topic);
  if (!txt) return null;
  const key = topic.toLowerCase().trim();
  return {
    text: txt,
    source: externalKB_sources[key] || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
  };
}

const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';

async function fetchMovieInfo(title) {
  if (!title || title.trim().length === 0) return null;
  const key = `media:${title.toLowerCase().trim()}`;
  if (externalKB[key]) return externalKB[key];

  if (OMDB_API_KEY) {
    try {
      const url = `http://www.omdbapi.com/?t=${encodeURIComponent(title)}&plot=short&r=json&apikey=${OMDB_API_KEY}`;
      const resp = await fetch(url);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.Response === 'True') {
          const parts = [];
          if (data.Title) parts.push(`${data.Title} (${data.Year || 'n/a'})`);
          if (data.Director && data.Director !== 'N/A') parts.push(`Directed by ${data.Director}`);
          if (data.Actors && data.Actors !== 'N/A') parts.push(`Starring ${data.Actors}`);
          if (data.Genre && data.Genre !== 'N/A') parts.push(`Genre: ${data.Genre}`);
          if (data.imdbRating && data.imdbRating !== 'N/A') parts.push(`IMDb: ${data.imdbRating}`);
          if (data.Plot && data.Plot !== 'N/A') parts.push(`Plot: ${data.Plot}`);
          const summary = parts.join('. ');
          externalKB[key] = summary;
          externalKB_sources[key] =
            data.Website && data.Website !== 'N/A'
              ? data.Website
              : `https://www.imdb.com/title/${data.imdbID || ''}`;
          return { text: summary, source: externalKB_sources[key] };
        }
      }
    } catch (err) {
      console.error('fetchMovieInfo(OMDb) error:', err && err.message);
    }
  }

  if (TMDB_API_KEY) {
    try {
      const tmdbSearch = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
      const r = await fetch(tmdbSearch);
      if (r && r.ok) {
        const j = await r.json();
        if (j && j.results && j.results.length > 0) {
          const item = j.results[0];
          const parts = [];
          const name = item.title || item.name || title;
          if (name) parts.push(`${name} (${item.release_date || item.first_air_date || 'n/a'})`);
          if (item.media_type) parts.push(`Type: ${item.media_type}`);
          if (item.overview) parts.push(`Overview: ${item.overview}`);
          const summary = parts.join('. ');
          externalKB[key] = summary;
          externalKB_sources[key] = `https://www.themoviedb.org/${item.media_type}/${item.id}`;
          return { text: summary, source: externalKB_sources[key] };
        }
      }
    } catch (err) {
      console.error('fetchMovieInfo(TMDb) error:', err && err.message);
    }
  }

  const variants = [
    `${title} (film)`,
    `${title} (movie)`,
    `${title} (TV series)`,
    `${title} (television series)`,
    `${title} (anime)`,
    `${title} (cartoon)`,
  ];
  for (const v of variants) {
    try {
      const wiki = await fetchWikipediaWithSource(v);
      if (wiki) {
        externalKB[key] = wiki.text;
        externalKB_sources[key] = wiki.source;
        return { text: wiki.text, source: wiki.source };
      }
    } catch (_err) {
      /* continue */
    }
  }

  try {
    const wiki = await fetchWikipediaWithSource(title);
    if (wiki) {
      externalKB[key] = wiki.text;
      externalKB_sources[key] = wiki.source;
      return { text: wiki.text, source: wiki.source };
    }
  } catch (err) {
    console.error('fetchMovieInfo(wiki fallback) error:', err && err.message);
  }

  return null;
}

async function fetchBookInfo(title) {
  if (!title || title.trim().length === 0) return null;
  const key = `book:${title.toLowerCase().trim()}`;
  if (externalKB[key]) return { text: externalKB[key], source: externalKB_sources[key] };
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=1`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.docs && data.docs.length > 0) {
      const doc = data.docs[0];
      const titleOut = doc.title || title;
      const author = (doc.author_name && doc.author_name.join(', ')) || 'Unknown author';
      const year = doc.first_publish_year || (doc.publish_year && doc.publish_year[0]) || 'n/a';
      const editions = doc.edition_count || 'n/a';
      const text = `${titleOut} (${year}) by ${author}. Editions: ${editions}.`;
      const source = doc.key
        ? `https://openlibrary.org${doc.key}`
        : `https://openlibrary.org/search?q=${encodeURIComponent(title)}`;
      externalKB[key] = text;
      externalKB_sources[key] = source;
      return { text, source };
    }
  } catch (err) {
    console.error('fetchBookInfo error:', err && err.message);
  }
  return null;
}

async function fetchMusicInfo(title) {
  if (!title || title.trim().length === 0) return null;
  const key = `music:${title.toLowerCase().trim()}`;
  if (externalKB[key]) return { text: externalKB[key], source: externalKB_sources[key] };
  try {
    const url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent('recording:"' + title + '"')}&fmt=json&limit=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'PersonalityChatbot/1.0 (https://localhost)' },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.recordings && data.recordings.length > 0) {
      const rec = data.recordings[0];
      const name = rec.title || title;
      const artist =
        rec['artist-credit'] && rec['artist-credit'][0] && rec['artist-credit'][0].name
          ? rec['artist-credit'][0].name
          : 'Unknown artist';
      const release =
        rec.releases && rec.releases[0] && rec.releases[0].date ? rec.releases[0].date : 'n/a';
      const text = `${name} by ${artist} (${release}). MusicBrainz ID: ${rec.id}`;
      const source = `https://musicbrainz.org/recording/${rec.id}`;
      externalKB[key] = text;
      externalKB_sources[key] = source;
      return { text, source };
    }
  } catch (err) {
    console.error('fetchMusicInfo error:', err && err.message);
  }
  return null;
}

async function fetchSportsInfo(name) {
  if (!name || name.trim().length === 0) return null;
  const key = `sports:${name.toLowerCase().trim()}`;
  if (externalKB[key]) return { text: externalKB[key], source: externalKB_sources[key] };

  const apiKey = process.env.SPORTSDB_API_KEY || '1';
  try {
    const teamUrl = `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchteams.php?t=${encodeURIComponent(name)}`;
    const r1 = await fetch(teamUrl, {
      headers: { 'User-Agent': 'PersonalityChatbot/1.0 (https://localhost)' },
    });
    if (r1 && r1.ok) {
      const j = await r1.json();
      if (j && j.teams && j.teams.length > 0) {
        const t = j.teams[0];
        const parts = [];
        if (t.strTeam) parts.push(`${t.strTeam} (${t.strCountry || 'n/a'})`);
        if (t.intFormedYear) parts.push(`Formed: ${t.intFormedYear}`);
        if (t.strLeague) parts.push(`League: ${t.strLeague}`);
        if (t.strStadium) parts.push(`Stadium: ${t.strStadium}`);
        if (t.strDescriptionEN) parts.push(`${t.strDescriptionEN.substring(0, 300)}...`);
        const text = parts.join('. ');
        const source = `https://www.thesportsdb.com/team/${t.idTeam}`;
        externalKB[key] = text;
        externalKB_sources[key] = source;
        return { text, source };
      }
    }
  } catch (err) {
    console.error('fetchSportsInfo(team) error:', err && err.message);
  }

  try {
    const playerUrl = `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(name)}`;
    const r2 = await fetch(playerUrl, {
      headers: { 'User-Agent': 'PersonalityChatbot/1.0 (https://localhost)' },
    });
    if (r2 && r2.ok) {
      const j2 = await r2.json();
      if (j2 && j2.player && j2.player.length > 0) {
        const p = j2.player[0];
        const parts = [];
        if (p.strPlayer) parts.push(`${p.strPlayer} (${p.strNationality || 'n/a'})`);
        if (p.strPosition) parts.push(`Position: ${p.strPosition}`);
        if (p.strTeam) parts.push(`Team: ${p.strTeam}`);
        if (p.dateBorn) parts.push(`Born: ${p.dateBorn}`);
        if (p.strDescriptionEN) parts.push(`${p.strDescriptionEN.substring(0, 300)}...`);
        const text = parts.join('. ');
        const source = `https://www.thesportsdb.com/athlete/${p.idPlayer}`;
        externalKB[key] = text;
        externalKB_sources[key] = source;
        return { text, source };
      }
    }
  } catch (err) {
    console.error('fetchSportsInfo(player) error:', err && err.message);
  }

  return null;
}

const adapters = [
  { name: 'book', fn: fetchBookInfo, hints: ['book', 'novel', 'author'] },
  { name: 'music', fn: fetchMusicInfo, hints: ['song', 'album', 'music', 'artist'] },
];

async function runAdapters(topic, lowerMsg) {
  for (const adapter of adapters) {
    for (const h of adapter.hints) {
      if (lowerMsg.includes(h) || topic.toLowerCase().includes(h)) {
        try {
          const res = await adapter.fn(topic);
          if (res) return res;
        } catch (_err) {
          /* ignore */
        }
      }
    }
  }
  if (topic.split(' ').length >= 2) {
    for (const adapter of adapters) {
      try {
        const res = await adapter.fn(topic);
        if (res) return res;
      } catch (_err) {
        /* ignore */
      }
    }
  }
  return null;
}

module.exports = {
  externalKB,
  externalKB_sources,
  fetchWikipediaSummary,
  fetchWikipediaWithSource,
  fetchMovieInfo,
  fetchBookInfo,
  fetchMusicInfo,
  fetchSportsInfo,
  runAdapters,
};
