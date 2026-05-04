const normalizeValue = (value) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const normalizeScheduled = (value) => {
  return normalizeValue(value)
    .replace(/\s+(est|edt)$/i, '')
    .trim();
};

const buildDeliveryKey = (row) => {
  return [
    normalizeScheduled(row.scheduled),
    normalizeValue(row.website),
    normalizeValue(row.type),
    normalizeValue(row.user)
  ].join('|||');
};

const emptyAsset = () => ({
  exists: false,
  text: '',
  imageUrl: null,
  videoUrl: null,
  linkUrl: null,
  thumbnailUrl: null
});

const hasScreenshot = (row) => {
  return Boolean(
    row?.screenshot?.exists ||
    row?.screenshotTwo?.exists
  );
};

const getBestDetailUrl = (...rows) => {
  for (const row of rows) {
    if (row?.detailUrl) return row.detailUrl;
  }

  return null;
};

const getBestMedia = (...rows) => {
  for (const row of rows) {
    if (row?.media?.exists) return row.media;
  }

  return emptyAsset();
};

const getBestScreenshot = (...rows) => {
  for (const row of rows) {
    if (row?.screenshot?.exists) return row.screenshot;
  }

  return emptyAsset();
};

const getBestScreenshotTwo = (...rows) => {
  for (const row of rows) {
    if (row?.screenshotTwo?.exists) return row.screenshotTwo;
  }

  return emptyAsset();
};

const createEmptySourceItem = (key, row) => {
  return {
    key,
    scheduled: row.scheduled || '',
    website: row.website || '',
    type: row.type || '',
    user: row.user || '',
    sources: {
      posts: null,
      screenshots: null,
      screenshotsTwos: null,
      approved: null,
      history: null
    }
  };
};

const addRowsToMap = (map, rows = [], sourceName) => {
  rows.forEach(row => {
    const key = row.key || buildDeliveryKey(row);

    if (!key || key === '|||||||||') return;

    if (!map.has(key)) {
      map.set(key, createEmptySourceItem(key, row));
    }

    const item = map.get(key);

    if (!item.scheduled && row.scheduled) item.scheduled = row.scheduled;
    if (!item.website && row.website) item.website = row.website;
    if (!item.type && row.type) item.type = row.type;
    if (!item.user && row.user) item.user = row.user;

    item.sources[sourceName] = row;
  });
};

const resolveDeliveryStatus = (item) => {
  const {
    posts,
    screenshots,
    screenshotsTwos,
    approved,
    history
  } = item.sources;

  if (approved) {
    return 'APPROVED';
  }

  if (hasScreenshot(screenshotsTwos)) {
    return 'COMPLETED_PENDING_APPROVAL';
  }

  if (hasScreenshot(screenshots)) {
    return 'COMPLETED_PENDING_APPROVAL';
  }

  if (screenshotsTwos || screenshots) {
    return 'PENDING_SCREENSHOT';
  }

  if (posts) {
    return 'ACTIVE_NO_SCREENSHOT_RECORD';
  }

  if (history) {
    return 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD';
  }

  return 'UNKNOWN';
};

const buildDeliveryMatcher = ({
  postsRows = [],
  screenshotsRows = [],
  screenshotsTwosRows = [],
  approvedRows = [],
  historyRows = []
}) => {
  const map = new Map();

  addRowsToMap(map, historyRows, 'history');
  addRowsToMap(map, postsRows, 'posts');
  addRowsToMap(map, screenshotsRows, 'screenshots');
  addRowsToMap(map, screenshotsTwosRows, 'screenshotsTwos');
  addRowsToMap(map, approvedRows, 'approved');

  const deliveries = Array.from(map.values()).map(item => {
    const {
      posts,
      screenshots,
      screenshotsTwos,
      approved,
      history
    } = item.sources;

    const status = resolveDeliveryStatus(item);

    const media = getBestMedia(
      approved,
      screenshotsTwos,
      screenshots,
      posts,
      history
    );

    const screenshot = getBestScreenshot(
      approved,
      screenshotsTwos,
      screenshots,
      history
    );

    const screenshotTwo = getBestScreenshotTwo(
      approved,
      screenshotsTwos,
      screenshots,
      history
    );

    const detailUrl = getBestDetailUrl(
      approved,
      screenshotsTwos,
      screenshots,
      history
    );

    return {
      key: item.key,
      scheduled: item.scheduled,
      website: item.website,
      type: item.type,
      user: item.user,

      status,
      media,
      screenshot,
      screenshotTwo,
      detailUrl,

      existsInPosts: Boolean(posts),
      existsInScreenshots: Boolean(screenshots),
      existsInScreenshotsTwos: Boolean(screenshotsTwos),
      existsInApproved: Boolean(approved),
      existsInHistory: Boolean(history),

      previousStatus: history?.status || history?.lastKnownStatus || null,
      firstSeenAt: history?.firstSeenAt || null,
      lastSeenAt: history?.lastSeenAt || null,

      sources: item.sources
    };
  });

  deliveries.sort((a, b) => {
    return String(a.scheduled).localeCompare(String(b.scheduled));
  });

  const approved = deliveries.filter(row => row.status === 'APPROVED');

  const completedPendingApproval = deliveries.filter(row =>
    row.status === 'COMPLETED_PENDING_APPROVAL'
  );

  const pendingScreenshot = deliveries.filter(row =>
    row.status === 'PENDING_SCREENSHOT'
  );

  const activeNoScreenshotRecord = deliveries.filter(row =>
    row.status === 'ACTIVE_NO_SCREENSHOT_RECORD'
  );

  const previouslySeenRemovedFromDashboard = deliveries.filter(row =>
    row.status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD'
  );

  const unknown = deliveries.filter(row =>
    row.status === 'UNKNOWN'
  );

  const completed = [
    ...approved,
    ...completedPendingApproval
  ];

  const pending = [
    ...pendingScreenshot,
    ...activeNoScreenshotRecord,
    ...previouslySeenRemovedFromDashboard,
    ...unknown
  ];

  return {
    deliveries,
    approved,
    completedPendingApproval,
    pendingScreenshot,
    activeNoScreenshotRecord,
    previouslySeenRemovedFromDashboard,
    unknown,
    completed,
    pending,

    summary: {
      totalExpected: deliveries.length,
      approved: approved.length,
      completedPendingApproval: completedPendingApproval.length,
      completedTotal: completed.length,
      pendingScreenshot: pendingScreenshot.length,
      activeNoScreenshotRecord: activeNoScreenshotRecord.length,
      previouslySeenRemovedFromDashboard: previouslySeenRemovedFromDashboard.length,
      unknown: unknown.length,
      pendingTotal: pending.length
    }
  };
};

const printDeliveryMatcherSummary = (matcher) => {
  console.log('');
  console.log('==================================================');
  console.log('DELIVERY MATCHER - RESUMEN GENERAL');
  console.log('==================================================');
  console.log(`Total esperado del día: ${matcher.summary.totalExpected}`);
  console.log(`Aprobados: ${matcher.summary.approved}`);
  console.log(`Completados pendiente aprobación: ${matcher.summary.completedPendingApproval}`);
  console.log(`Total completados: ${matcher.summary.completedTotal}`);
  console.log(`Pendientes screenshot: ${matcher.summary.pendingScreenshot}`);
  console.log(`Activos sin registro screenshot: ${matcher.summary.activeNoScreenshotRecord}`);
  console.log(`Vistos antes pero removidos del dashboard: ${matcher.summary.previouslySeenRemovedFromDashboard}`);
  console.log(`Unknown: ${matcher.summary.unknown}`);
  console.log(`Total pendientes: ${matcher.summary.pendingTotal}`);

  console.log('');
  console.log('==================================================');
  console.log('DELIVERY MATCHER - PENDIENTES');
  console.log('==================================================');

  if (!matcher.pending.length) {
    console.log('No hay publicaciones pendientes.');
    return;
  }

  matcher.pending.forEach((row, index) => {
    console.log(`${index + 1}. ${row.scheduled} - ${row.website} - ${row.type} - ${row.user}`);
    console.log(`   Status: ${row.status}`);
    console.log(`   Previous status: ${row.previousStatus || 'N/A'}`);
    console.log(`   First seen: ${row.firstSeenAt || 'N/A'}`);
    console.log(`   Last seen: ${row.lastSeenAt || 'N/A'}`);
    console.log(`   In posts: ${row.existsInPosts ? 'YES' : 'NO'}`);
    console.log(`   In screenshots: ${row.existsInScreenshots ? 'YES' : 'NO'}`);
    console.log(`   In screenshots-twos: ${row.existsInScreenshotsTwos ? 'YES' : 'NO'}`);
    console.log(`   In approved: ${row.existsInApproved ? 'YES' : 'NO'}`);
    console.log(`   In history: ${row.existsInHistory ? 'YES' : 'NO'}`);
    console.log(`   Media: ${row.media?.thumbnailUrl || 'no media url'}`);
    console.log(`   Detail: ${row.detailUrl || 'no detail url'}`);
  });
};

module.exports = {
  buildDeliveryKey,
  buildDeliveryMatcher,
  printDeliveryMatcherSummary
};