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
  saveDeliveryHistory,
  buildHistorySummary
} = require('../src/services/deliveryHistoryService');
const {
  assertRequiredIndexes
} = require('../src/utils/validationUtils');
const {
  getPublisherNotes,
  getWhatsappGroupName
} = require('../src/config/publishers');
const {
  getPublisherDeliveryReminder,
  isPublisherDeliveryAllowed
} = require('../src/services/deliveryRules');

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

assert.strictEqual(getWhatsappGroupName('Kosher.com'), 'NEW JCN x Kosher Group');
assert.ok(getPublisherNotes('Israel Breaking News').some(note => note.includes('NO STATUS')));
assert.strictEqual(isPublisherDeliveryAllowed(delivery({
  website: 'Israel Breaking News',
  type: 'whatsapp'
})), false);
assert.strictEqual(isPublisherDeliveryAllowed(delivery({
  website: 'Israel Breaking News',
  type: 'whatsapp-group'
})), true);
assert.match(getPublisherDeliveryReminder(delivery({
  website: 'Israel Breaking News',
  type: 'Status'
})), /no hace Status/i);

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

const sponsoredArticleMatcher = buildDeliveryMatcher({
  postsRows: [delivery({
    scheduled: '08/24/2026, 07:00 PM EDT',
    website: 'Arutz Sheva',
    type: ' Sponsored   Article ',
    user: 'David Persiko'
  })]
});

assert.strictEqual(sponsoredArticleMatcher.deliveries[0].status, 'NO_SCREENSHOT_REQUIRED');
assert.strictEqual(sponsoredArticleMatcher.deliveries.length, 1, 'The item remains visible in the register');
assert.strictEqual(sponsoredArticleMatcher.completed.length, 1, 'The item is complete by default');
assert.strictEqual(sponsoredArticleMatcher.pending.length, 0, 'The item never enters reminders');
assert.strictEqual(sponsoredArticleMatcher.summary.totalExpected, 0, 'The item is excluded from screenshot totals');
assert.strictEqual(sponsoredArticleMatcher.summary.completedTotal, 0, 'The item is excluded from completed totals');
assert.strictEqual(sponsoredArticleMatcher.summary.noScreenshotRequired, 1);

assert.deepStrictEqual(
  buildHistorySummary(sponsoredArticleMatcher.deliveries),
  {
    totalExpected: 0,
    approved: 0,
    completedPendingApproval: 0,
    completedTotal: 0,
    noScreenshotRequired: 1,
    pendingScreenshot: 0,
    activeNoScreenshotRecord: 0,
    previouslySeenRemovedFromDashboard: 0,
    unknown: 0,
    pendingTotal: 0
  }
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
