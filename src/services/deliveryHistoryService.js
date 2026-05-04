const fs = require('fs');
const path = require('path');

const getDeliveryHistoryFilePath = (reportsFolder, reportDate) => {
  return path.join(reportsFolder, `delivery-history-${reportDate}.json`);
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

    firstSeenAt: row.firstSeenAt || null,
    lastSeenAt: row.lastSeenAt || null,
    lastKnownStatus: row.status || 'UNKNOWN'
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

  const previousRows = loadDeliveryHistory(reportsFolder, reportDate);

  const map = new Map();

  previousRows.forEach(row => {
    if (!row.key) return;
    map.set(row.key, row);
  });

  const now = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date());

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
};

module.exports = {
  getDeliveryHistoryFilePath,
  loadDeliveryHistory,
  saveDeliveryHistory
};