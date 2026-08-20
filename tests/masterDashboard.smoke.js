const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const {
  generateIntegratedHtmlReportByPublisher
} = require('../src/reports/integratedReport');
const {
  buildDeliveryKey,
  buildDeliveryMatcher
} = require('../src/services/screenshotMatcherService');
const {
  shouldStopAfterPage
} = require('../src/utils/paginationUtils');

const emptyAsset = () => ({
  exists: false,
  text: '',
  imageUrl: null,
  videoUrl: null,
  linkUrl: null,
  thumbnailUrl: null
});

const createDelivery = ({ scheduled, user, status, approved = false }) => {
  const base = {
    scheduled,
    website: "N'shei News",
    type: 'whatsapp-group',
    user
  };

  return {
    ...base,
    key: buildDeliveryKey(base),
    status,
    media: emptyAsset(),
    screenshot: emptyAsset(),
    screenshotTwo: emptyAsset(),
    detailUrl: null,
    existsInPosts: !approved,
    existsInScreenshots: true,
    existsInScreenshotsTwos: true,
    existsInApproved: approved,
    existsInHistory: false,
    previousStatus: null,
    firstSeenAt: null,
    lastSeenAt: null
  };
};

const createMatcher = (deliveries) => {
  const approved = deliveries.filter(row => row.status === 'APPROVED');
  const completedPendingApproval = deliveries.filter(row => row.status === 'COMPLETED_PENDING_APPROVAL');
  const pending = deliveries.filter(row => row.status !== 'APPROVED');

  return {
    deliveries,
    approved,
    completedPendingApproval,
    pending,
    completed: [...approved, ...completedPendingApproval],
    summary: {
      totalExpected: deliveries.length,
      approved: approved.length,
      completedPendingApproval: completedPendingApproval.length,
      completedTotal: approved.length + completedPendingApproval.length,
      pendingScreenshot: deliveries.filter(row => row.status === 'PENDING_SCREENSHOT').length,
      activeNoScreenshotRecord: 0,
      previouslySeenRemovedFromDashboard: 0,
      unknown: 0,
      pendingTotal: pending.length
    }
  };
};

const approvedHistoryRow = createDelivery({
  scheduled: '08/18/2026, 06:00 PM EDT',
  user: 'Previously Approved',
  status: 'APPROVED',
  approved: true
});
const preservedMatcher = buildDeliveryMatcher({ historyRows: [approvedHistoryRow] });
assert.strictEqual(
  preservedMatcher.deliveries[0].status,
  'APPROVED',
  'An approved historical delivery must remain closed when it leaves the current page'
);

assert.strictEqual(shouldStopAfterPage({
  headers: ['Scheduled Time'],
  oldestDateString: '08/19/2026',
  rows: [
    { cellsText: ['08/20/2026, 06:00 PM EDT'] },
    { cellsText: ['08/19/2026, 06:00 PM EDT'] },
    { cellsText: ['08/18/2026, 06:00 PM EDT'] }
  ]
}), true, 'A descending page that crosses yesterday should stop pagination');

(async () => {
  const originalCwd = process.cwd();
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jcn-master-dashboard-'));
  let browser;

  try {
    process.chdir(testRoot);
    process.env.CI = 'true';
    process.env.REPORT_OVERWRITE = 'true';

    const todayPending = createDelivery({
      scheduled: '08/20/2026, 06:00 PM EDT',
      user: 'Client Today',
      status: 'PENDING_SCREENSHOT'
    });
    const todayApproved = createDelivery({
      scheduled: '08/20/2026, 03:00 PM EDT',
      user: 'Client Approved',
      status: 'APPROVED',
      approved: true
    });
    const yesterdayPending = createDelivery({
      scheduled: '08/19/2026, 10:00 PM EDT',
      user: 'Client Overnight',
      status: 'PENDING_SCREENSHOT'
    });

    const todayRow = {
      scheduled: todayPending.scheduled,
      website: todayPending.website,
      type: todayPending.type,
      user: todayPending.user,
      isNew: false
    };

    generateIntegratedHtmlReportByPublisher({
      allRows: [todayRow],
      reminderRows: [todayRow],
      saturdayRows: [],
      removedRows: [{
        scheduled: todayApproved.scheduled,
        website: todayApproved.website,
        type: todayApproved.type,
        user: todayApproved.user
      }],
      newRows: [],
      sameRows: [todayRow],
      generatedAtRD: '08/20/2026, 02:00:00 PM',
      generatedAtEpochMs: Date.now(),
      reportDate: '2026-08-20',
      yesterdayReportDate: '2026-08-19',
      todayString: '08/20/2026',
      yesterdayString: '08/19/2026',
      tomorrowString: '08/21/2026',
      deliveryMatcher: createMatcher([todayPending, todayApproved]),
      yesterdayDeliveryMatcher: createMatcher([yesterdayPending]),
      deliveryHistoryBundle: []
    });

    const reportPath = path.join(
      testRoot,
      'reporte',
      'reporte-publishers-integrado-2026-08-20.html'
    );

    assert.ok(fs.existsSync(reportPath), 'The integrated report should be generated');

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(pathToFileURL(reportPath).href);

    await page.waitForSelector('#master.active');
    assert.strictEqual(await page.locator('#master .delivery-card').count(), 3);
    assert.strictEqual(await page.locator('#master .master-delivery-assets').count(), 3);
    assert.strictEqual(await page.locator('#master .delivery-manual-control').count(), 0);
    await page.getByRole('button', { name: /Removidos/ }).click();
    await page.waitForSelector('#removed.active');
    assert.strictEqual(await page.locator('#removed .status-journey').count(), 0);
    assert.strictEqual(await page.locator('#removed .delivery-manual-control').count(), 0);

    await page.getByRole('button', { name: /Master Dashboard/ }).click();
    const todayCard = page.locator('#master .delivery-card').filter({ hasText: 'Client Today' });
    const deliveryKey = await todayCard.getAttribute('data-delivery-key');
    await todayCard.locator('[data-stage="COMPLETED"]').click();

    assert.strictEqual(await todayCard.getAttribute('data-is-closed'), 'true');
    await page.getByRole('button', { name: /5PM/ }).click();
    await page.waitForSelector('#after5pm.active');
    assert.strictEqual(await page.locator('#after5pm .status-journey').count(), 0);
    assert.strictEqual(await page.locator('#after5pm .compact-status-select').count(), 0);

    await page.getByRole('button', { name: /Master Dashboard/ }).click();
    await page.locator('#master .work-queue-toolbar select').selectOption('all');
    await todayCard.locator('[data-stage="MOVED"]').click();
    await todayCard.locator('[data-stage="MOVED"].journey-active').waitFor();
    assert.strictEqual(await todayCard.getAttribute('data-is-closed'), 'true');

    await todayCard.locator('[data-delivery-flag="noResponse"]').click();
    await todayCard.locator('[data-delivery-flag="noResponse"].journey-active').waitFor();

    await page.getByRole('button', { name: /Screenshot Status Today/ }).click();
    await page.waitForSelector('#delivery.active');
    assert.ok(await page.locator('#delivery .delivery-manual-control').count() > 0);
    assert.ok(await page.locator('#delivery input[type="datetime-local"]').count() > 0);

    assert.ok(deliveryKey, 'The delivery key should be shared across views');
    if (process.env.JCN_KEEP_TEST_REPORT === 'true') {
      const screenshotPath = path.join(testRoot, 'master-dashboard-smoke.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Visual test artifact: ${screenshotPath}`);
    }
    console.log('Master Dashboard smoke test passed.');
  } finally {
    if (browser) await browser.close();
    process.chdir(originalCwd);
    if (process.env.JCN_KEEP_TEST_REPORT !== 'true') {
      fs.rmSync(testRoot, { recursive: true, force: true });
    }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
