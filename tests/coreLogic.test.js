const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildDeliveryKey,
  buildDeliveryMatcher
} = require('../src/services/screenshotMatcherService');
const {
  loadDeliveryHistory,
  saveDeliveryHistory
} = require('../src/services/deliveryHistoryService');
const {
  assertRequiredIndexes
} = require('../src/utils/validationUtils');

const asset = (exists = false) => ({
  exists,
  text: '',
  imageUrl: exists ? 'https://example.test/evidence.jpg' : null,
  videoUrl: null,
  linkUrl: null,
  thumbnailUrl: exists ? 'https://example.test/evidence.jpg' : null
});

const delivery = (overrides = {}) => ({
  scheduled: '08/21/2026, 10:00 AM EDT',
  website: 'Example Publisher',
  type: 'whatsapp-group',
  user: 'Example Client',
  media: asset(true),
  screenshot: asset(false),
  screenshotTwo: asset(false),
  detailUrl: 'https://example.test/detail/1',
  ...overrides
});

const match = (sources) => buildDeliveryMatcher(sources).deliveries[0];

assert.strictEqual(
  match({ approvedRows: [delivery({ screenshot: asset(true) })] }).status,
  'APPROVED'
);

assert.strictEqual(
  match({ screenshotsRows: [delivery({ screenshot: asset(true) })] }).status,
  'COMPLETED_PENDING_APPROVAL'
);

assert.strictEqual(
  match({ screenshotsTwosRows: [delivery()] }).status,
  'PENDING_SCREENSHOT'
);

assert.strictEqual(
  match({ postsRows: [delivery()] }).status,
  'ACTIVE_NO_SCREENSHOT_RECORD'
);

assert.strictEqual(
  match({ historyRows: [delivery({ status: 'PENDING_SCREENSHOT' })] }).status,
  'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD'
);

assert.strictEqual(
  match({ historyRows: [delivery({ status: 'APPROVED' })] }).status,
  'APPROVED',
  'Approved evidence must remain terminal after leaving current pages'
);

assert.strictEqual(
  match({ historyRows: [delivery({ status: 'COMPLETED_PENDING_APPROVAL' })] }).status,
  'COMPLETED_PENDING_APPROVAL',
  'Previously observed screenshot evidence must be preserved'
);

assert.strictEqual(
  buildDeliveryKey(delivery({ scheduled: '08/21/2026, 10:00 AM EST' })),
  buildDeliveryKey(delivery({ scheduled: '08/21/2026, 10:00 AM EDT' }))
);

assert.doesNotThrow(() => assertRequiredIndexes({
  source: 'test',
  headers: ['Scheduled Time', 'Website'],
  indexes: { scheduled: 0, publisher: 1 }
}));

assert.throws(() => assertRequiredIndexes({
  source: 'test',
  headers: ['Scheduled Time'],
  indexes: { scheduled: 0, publisher: -1 }
}), /publisher/);

const historyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jcn-history-test-'));

try {
  const reportDate = '2026-08-21';
  const row = match({ screenshotsRows: [delivery({ screenshot: asset(true) })] });
  saveDeliveryHistory(historyRoot, reportDate, [row]);
  const stored = loadDeliveryHistory(historyRoot, reportDate);

  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].status, 'COMPLETED_PENDING_APPROVAL');
  assert.ok(stored[0].firstSeenAt);
  assert.ok(stored[0].lastSeenAt);
} finally {
  fs.rmSync(historyRoot, { recursive: true, force: true });
}

console.log('Core delivery logic tests passed.');
