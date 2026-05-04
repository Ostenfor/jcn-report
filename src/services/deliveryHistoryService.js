const fs = require('fs');
const path = require('path');

const HISTORY_PREFIX = 'delivery-history-';
const HISTORY_EXTENSION = '.json';

const getDeliveryHistoryFilePath = (reportsFolder, reportDate) => {
  return path.join(reportsFolder, `${HISTORY_PREFIX}${reportDate}${HISTORY_EXTENSION}`);
};

const emptyAsset = () => ({
  exists: false,
  text: '',
  imageUrl: null,
  videoUrl: null,
  linkUrl: null,
  thumbnailUrl: null
});

const cleanAsset = (asset) => {
  if (!asset) return emptyAsset();

  return {
    exists: Boolean(asset.exists),
    text: asset.text || '',
    imageUrl: asset.imageUrl || null,
    videoUrl: asset.videoUrl || null,
    linkUrl: asset.linkUrl || null,
    thumbnailUrl: asset.thumbnailUrl || null
  };
};

const cleanDeliveryForHistory = (row) => {
  return {
    key: row.key,
    scheduled: row.scheduled || '',
    website: row.website || '',
    type: row.type || '',
    user: row.user || '',

    status: row.status || 'UNKNOWN',
    media: cleanAsset(row.media),
    screenshot: cleanAsset(row.screenshot),
    screenshotTwo: cleanAsset(row.screenshotTwo),
    detailUrl: row.detailUrl || null,

    existsInPosts: Boolean(row.existsInPosts),
    existsInScreenshots: Boolean(row.existsInScreenshots),
    existsInScreenshotsTwos: Boolean(row.existsInScreenshotsTwos),
    existsInApproved: Boolean(row.existsInApproved),
    existsInHistory: Boolean(row.existsInHistory),

    previousStatus: row.previousStatus || null,
    firstSeenAt: row.firstSeenAt || null,
    lastSeenAt: row.lastSeenAt || null,
    lastKnownStatus: row.status || 'UNKNOWN'
  };
};

const getNowRD = () => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date());
};

const formatDisplayDate = (reportDate) => {
  const [year, month, day] = String(reportDate).split('-');

  if (!year || !month || !day) return reportDate;

  return `${month}/${day}/${year}`;
};

const getHistoryLabel = (reportDate, currentReportDate, index) => {
  if (reportDate === currentReportDate) {
    return `Today - ${formatDisplayDate(reportDate)}`;
  }

  if (index === 1) {
    return `Yesterday - ${formatDisplayDate(reportDate)}`;
  }

  if (index === 2) {
    return `2 days ago - ${formatDisplayDate(reportDate)}`;
  }

  return formatDisplayDate(reportDate);
};

const getHistoryFiles = (reportsFolder) => {
  if (!fs.existsSync(reportsFolder)) return [];

  return fs.readdirSync(reportsFolder)
    .filter(fileName =>
      fileName.startsWith(HISTORY_PREFIX) &&
      fileName.endsWith(HISTORY_EXTENSION)
    )
    .map(fileName => {
      const reportDate = fileName
        .replace(HISTORY_PREFIX, '')
        .replace(HISTORY_EXTENSION, '');

      return {
        fileName,
        reportDate,
        filePath: path.join(reportsFolder, fileName)
      };
    })
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
};

const buildHistorySummary = (rows) => {
  const approved = rows.filter(row => row.status === 'APPROVED');

  const completedPendingApproval = rows.filter(row =>
    row.status === 'COMPLETED_PENDING_APPROVAL'
  );

  const pendingScreenshot = rows.filter(row =>
    row.status === 'PENDING_SCREENSHOT'
  );

  const activeNoScreenshotRecord = rows.filter(row =>
    row.status === 'ACTIVE_NO_SCREENSHOT_RECORD'
  );

  const previouslySeenRemovedFromDashboard = rows.filter(row =>
    row.status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD'
  );

  const unknown = rows.filter(row =>
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
    totalExpected: rows.length,
    approved: approved.length,
    completedPendingApproval: completedPendingApproval.length,
    completedTotal: completed.length,
    pendingScreenshot: pendingScreenshot.length,
    activeNoScreenshotRecord: activeNoScreenshotRecord.length,
    previouslySeenRemovedFromDashboard: previouslySeenRemovedFromDashboard.length,
    unknown: unknown.length,
    pendingTotal: pending.length
  };
};

const buildHistoryBundleItem = ({
  reportDate,
  currentReportDate,
  rows,
  index
}) => {
  const summary = buildHistorySummary(rows);

  const completed = rows.filter(row =>
    row.status === 'APPROVED' ||
    row.status === 'COMPLETED_PENDING_APPROVAL'
  );

  const pending = rows.filter(row =>
    row.status !== 'APPROVED' &&
    row.status !== 'COMPLETED_PENDING_APPROVAL'
  );

  return {
    reportDate,
    label: getHistoryLabel(reportDate, currentReportDate, index),
    total: rows.length,
    summary,
    completed,
    pending,
    rows
  };
};

const loadDeliveryHistory = (reportsFolder, reportDate) => {
  const filePath = getDeliveryHistoryFilePath(reportsFolder, reportDate);

  if (!fs.existsSync(filePath)) {
    console.log('');
    console.log('==================================================');
    console.log('DELIVERY HISTORY');
    console.log('==================================================');
    console.log('No hay histórico local todavía para este día.');

    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);

    const rows = Array.isArray(parsed.rows) ? parsed.rows : [];

    console.log('');
    console.log('==================================================');
    console.log('DELIVERY HISTORY ENCONTRADO');
    console.log('==================================================');
    console.log(`Archivo: ${filePath}`);
    console.log(`Registros históricos: ${rows.length}`);

    return rows;
  } catch (error) {
    console.log('');
    console.log('==================================================');
    console.log('DELIVERY HISTORY ERROR');
    console.log('==================================================');
    console.log(`No se pudo leer el histórico: ${filePath}`);
    console.log(error.message);

    return [];
  }
};

const saveDeliveryHistory = (reportsFolder, reportDate, deliveries) => {
  if (!fs.existsSync(reportsFolder)) {
    fs.mkdirSync(reportsFolder, {
      recursive: true
    });
  }

  const filePath = getDeliveryHistoryFilePath(reportsFolder, reportDate);

  const previousRows = fs.existsSync(filePath)
    ? loadDeliveryHistory(reportsFolder, reportDate)
    : [];

  const map = new Map();

  previousRows.forEach(row => {
    if (!row.key) return;
    map.set(row.key, row);
  });

  const now = getNowRD();

  deliveries.forEach(row => {
    if (!row.key) return;

    const previous = map.get(row.key);
    const cleaned = cleanDeliveryForHistory(row);

    cleaned.firstSeenAt = previous?.firstSeenAt || now;
    cleaned.lastSeenAt = now;

    map.set(row.key, cleaned);
  });

  const rows = Array.from(map.values())
    .sort((a, b) => String(a.scheduled).localeCompare(String(b.scheduled)));

  const payload = {
    reportDate,
    updatedAtRD: now,
    total: rows.length,
    rows
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');

  console.log('');
  console.log('==================================================');
  console.log('DELIVERY HISTORY GUARDADO');
  console.log('==================================================');
  console.log(`Archivo: ${filePath}`);
  console.log(`Registros guardados: ${rows.length}`);

  return rows;
};

const pruneDeliveryHistory = (reportsFolder, daysToKeep = 3) => {
  const files = getHistoryFiles(reportsFolder);

  const filesToDelete = files.slice(daysToKeep);

  filesToDelete.forEach(file => {
    try {
      fs.unlinkSync(file.filePath);

      console.log('');
      console.log('==================================================');
      console.log('DELIVERY HISTORY BORRADO');
      console.log('==================================================');
      console.log(`Archivo eliminado: ${file.filePath}`);
    } catch (error) {
      console.log(`No se pudo borrar histórico viejo: ${file.filePath}`);
      console.log(error.message);
    }
  });

  return filesToDelete;
};

const loadRecentDeliveryHistoryBundle = (reportsFolder, currentReportDate, daysToKeep = 3) => {
  pruneDeliveryHistory(reportsFolder, daysToKeep);

  const files = getHistoryFiles(reportsFolder).slice(0, daysToKeep);

  const bundle = files.map((file, index) => {
    try {
      const raw = fs.readFileSync(file.filePath, 'utf8');
      const parsed = JSON.parse(raw);

      const rows = Array.isArray(parsed.rows) ? parsed.rows : [];

      return buildHistoryBundleItem({
        reportDate: file.reportDate,
        currentReportDate,
        rows,
        index
      });
    } catch (error) {
      console.log(`No se pudo cargar histórico para bundle: ${file.filePath}`);
      console.log(error.message);

      return buildHistoryBundleItem({
        reportDate: file.reportDate,
        currentReportDate,
        rows: [],
        index
      });
    }
  });

  console.log('');
  console.log('==================================================');
  console.log('DELIVERY HISTORY BUNDLE');
  console.log('==================================================');
  console.log(`Días cargados: ${bundle.length}`);

  bundle.forEach(item => {
    console.log(`${item.label}: total ${item.summary.totalExpected}, completed ${item.summary.completedTotal}, pending ${item.summary.pendingTotal}`);
  });

  return bundle;
};

module.exports = {
  getDeliveryHistoryFilePath,
  loadDeliveryHistory,
  saveDeliveryHistory,
  pruneDeliveryHistory,
  loadRecentDeliveryHistoryBundle,
  buildHistorySummary
};