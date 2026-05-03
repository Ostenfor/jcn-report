const fs = require('fs');
const path = require('path');

const rowKey = (row) => {
  return [
    row.scheduled,
    row.website,
    row.type,
    row.user
  ].join('|||');
};

const keyToRow = (key) => {
  const [scheduled, website, type, user] = String(key).split('|||');
  return { scheduled, website, type, user };
};

const loadPreviousSnapshot = async (reportsFolder, reportDate) => {
  const snapshotFileName = `snapshot-${reportDate}.json`;
  const localSnapshotPath = path.join(reportsFolder, snapshotFileName);

  if (fs.existsSync(localSnapshotPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localSnapshotPath, 'utf8'));

      console.log('');
      console.log('==================================================');
      console.log('SNAPSHOT LOCAL ENCONTRADO');
      console.log('==================================================');
      console.log(`Archivo: ${localSnapshotPath}`);
      console.log(`Registros anteriores: ${Array.isArray(data.rows) ? data.rows.length : 0}`);

      return Array.isArray(data.rows) ? data.rows : [];
    } catch (error) {
      console.log('Snapshot local inválido. Se ignorará.');
      return [];
    }
  }

  const pagesBaseUrl = (
    process.env.PAGES_BASE_URL ||
    'https://ostenfor.github.io/jcn-report'
  ).replace(/\/$/, '');

  const snapshotUrl = `${pagesBaseUrl}/${snapshotFileName}`;

  try {
    console.log('');
    console.log('==================================================');
    console.log('BUSCANDO SNAPSHOT EN GITHUB PAGES');
    console.log('==================================================');
    console.log(`URL: ${snapshotUrl}`);

    const response = await fetch(snapshotUrl, {
      cache: 'no-store'
    });

    if (!response.ok) {
      console.log(`No se encontró snapshot publicado. Status: ${response.status}`);
      return [];
    }

    const data = await response.json();

    console.log('Snapshot encontrado en Pages.');
    console.log(`Registros anteriores: ${Array.isArray(data.rows) ? data.rows.length : 0}`);

    return Array.isArray(data.rows) ? data.rows : [];

  } catch (error) {
    console.log('No se pudo leer snapshot desde Pages.');
    console.log(error.message);
    return [];
  }
};

const saveSnapshot = (reportsFolder, reportDate, rows) => {
  const snapshotFileName = `snapshot-${reportDate}.json`;
  const snapshotPath = path.join(reportsFolder, snapshotFileName);

  const payload = {
    reportDate,
    generatedAt: new Date().toISOString(),
    rows: rows.map(rowKey)
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log('');
  console.log('==================================================');
  console.log('SNAPSHOT GUARDADO');
  console.log('==================================================');
  console.log(`Archivo: ${snapshotPath}`);
  console.log(`Registros guardados: ${payload.rows.length}`);
};

module.exports = {
  rowKey,
  keyToRow,
  loadPreviousSnapshot,
  saveSnapshot
};