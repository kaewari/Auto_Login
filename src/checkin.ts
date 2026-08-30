import { run } from './main.js';

run().catch((err) => {
  console.error('[Checkin Fatal]', err);
  process.exit(1);
});
