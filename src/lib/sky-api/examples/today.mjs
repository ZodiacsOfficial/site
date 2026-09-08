const response = await fetch('https://zodiacs.org/api/v1/sky/today.json', {
  cache: 'no-cache',
  signal: AbortSignal.timeout(10_000),
});
if (!response.ok) throw new Error(`Sky request failed: HTTP ${response.status}`);

const sky = await response.json();
if (sky?.schema !== 'zodiacs.sky-api.today.v1'
  || typeof sky.date !== 'string'
  || typeof sky.snapshotAt !== 'string'
  || typeof sky.summary !== 'string'
  || !Array.isArray(sky.bodies)
  || sky.bodies.length === 0
  || sky.bodies.some((body) => !body
    || typeof body !== 'object'
    || typeof body.body !== 'string'
    || typeof body.position !== 'string'
    || typeof body.retrograde !== 'boolean')) {
  throw new Error('Unexpected sky payload');
}

const today = new Date().toISOString().slice(0, 10);
if (sky.date !== today) {
  throw new Error(`Sky edition ${sky.date} is not current (${today} UTC)`);
}
if (sky.snapshotAt !== `${sky.date}T12:00:00.000Z`) {
  throw new Error('Unexpected sky snapshot time');
}

console.log(`Computed positions for ${sky.snapshotAt}`);
console.log(sky.summary);
for (const body of sky.bodies) {
  console.log(body.body, body.position, body.retrograde ? 'Rx' : '');
}
