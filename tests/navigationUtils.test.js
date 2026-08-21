const assert = require('assert');
const { safeGoto } = require('../src/utils/navigationUtils');

(async () => {
  let attempts = 0;
  let waits = 0;

  await safeGoto({
    goto: async () => {
      attempts += 1;
    },
    waitForTimeout: async () => {
      throw new Error('Successful navigation must not wait or retry');
    }
  }, 'https://example.test');

  assert.strictEqual(attempts, 1);
  attempts = 0;

  await safeGoto({
    goto: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('net::ERR_NETWORK_CHANGED');
    },
    waitForTimeout: async delay => {
      assert.strictEqual(delay, 25);
      waits += 1;
    }
  }, 'https://example.test', { maxAttempts: 2, retryDelayMs: 25 });

  assert.strictEqual(attempts, 2);
  assert.strictEqual(waits, 1);

  attempts = 0;
  await safeGoto({
    goto: async () => {
      attempts += 1;
      throw new Error('net::ERR_ABORTED');
    },
    waitForTimeout: async () => {
      throw new Error('Redirect interruptions must not wait or retry');
    }
  }, 'https://example.test');

  assert.strictEqual(attempts, 1);

  attempts = 0;
  await assert.rejects(
    () => safeGoto({
      goto: async () => {
        attempts += 1;
        throw new Error('Permanent navigation failure');
      },
      waitForTimeout: async () => {}
    }, 'https://example.test', { maxAttempts: 2, retryDelayMs: 0 }),
    /Permanent navigation failure/
  );

  assert.strictEqual(attempts, 2);
  console.log('Navigation retry tests passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
