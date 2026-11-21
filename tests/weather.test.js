const { describe, it } = require('node:test');
const assert = require('node:assert');
const { registerBuiltInPlugins, matchAndExecute } = require('../src/plugins');

describe('weather plugin', () => {
  it('handles natural location phrasing and suppresses generic plugin responses', async () => {
    registerBuiltInPlugins();
    const originalFetch = global.fetch;
    const requestedUrls = [];

    global.fetch = async (input) => {
      const url = new URL(input);
      requestedUrls.push(url);

      if (url.hostname === 'geocoding-api.open-meteo.com') {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                name: 'Madhapur',
                admin1: 'Rajasthan',
                admin2: 'Alwar',
                country: 'India',
                country_code: 'IN',
                latitude: 28.07,
                longitude: 76.81,
              },
              {
                name: 'Madhapur',
                admin1: 'Telangana',
                admin2: 'Ranga Reddy',
                country: 'India',
                country_code: 'IN',
                latitude: 17.44,
                longitude: 78.39,
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 28,
            relative_humidity_2m: 60,
            apparent_temperature: 30,
            weather_code: 1,
            wind_speed_10m: 10,
            precipitation: 0,
          },
          daily: {
            time: ['2026-11-21', '2026-11-22'],
            weather_code: [1, 2],
            temperature_2m_max: [30, 31],
            temperature_2m_min: [20, 21],
            precipitation_probability_max: [5, 10],
          },
        }),
      };
    };

    try {
      const results = await matchAndExecute(
        'what is the weather like today in madhapur, hyderabad, telangana',
        { llm: async () => ({ text: 'This generic response must not be used.' }) }
      );

      assert.deepStrictEqual(results.map(result => result.pluginId), ['weather']);
      assert.match(results[0].result.text, /Madhapur, Ranga Reddy, Telangana, India/);
      assert.match(results[0].result.text, /28°C/);
      assert.ok(requestedUrls.some(url => url.hostname === 'geocoding-api.open-meteo.com' && url.searchParams.get('name') === 'madhapur'));
      assert.ok(requestedUrls.some(url => url.hostname === 'api.open-meteo.com' && url.searchParams.get('latitude') === '17.44'));
    } finally {
      global.fetch = originalFetch;
    }
  });
});
