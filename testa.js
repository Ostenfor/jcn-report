require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  const allowedPublishers = new Set([
    'KolHaolam',
    'Lakewood Scoop',
    'Jewish News 24',
    'Meaningful Minute',
    'COL Live',
    'VINnews (Vos Iz Neias)',
    'Jewish Breaking News',
    'Yoilish status',
    'SY Alerts',
    'Five Towns Central',
    'Just My Israel',
    "N'Shei News",
    'Belaaz',
    'Arutz Sheva',
    'Chez Chaya',
    'Kosher.com',
    'Zemel',
    'The Perlowitz Show',
    'Mommy Deals',
    'Raizys Cooking',
    'Israel Breaking News',
    'Israel Live News',
    'Meira K.',
    'Efraim Feder in Lakewood Status',
    'Matzav',
    'Addictive Ads',
    'Simcha Spot',
    'W365',
    'BP24',
    'BP 24',
    'JDN',
    'Rockland Daily'
  ]);

  const normalize = (text) => (text || '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  const allowedPublishersNormalized = new Set(
    [...allowedPublishers].map(normalize)
  );

  const parseDate = (text) => {
    const cleaned = (text || '').replace(' EDT', '').trim();
    return new Date(cleaned);
  };

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

  const isAtOrAfter5PM = (scheduledText) => {
    const date = parseDate(scheduledText);
    if (isNaN(date.getTime())) return false;
    return date.getHours() >= 17;
  };

  const escapeHtml = (text) => {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };

  const safeGoto = async (url) => {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    } catch (error) {
      if (
        error.message.includes('ERR_ABORTED') ||
        error.message.includes('Navigation failed because page was closed') ||
        error.message.includes('Navigation interrupted')
      ) {
        console.log('La navegación fue abortada por redirect/Nova, continuando...');
      } else {
        throw error;
      }
    }
  };

  const openHtmlFile = (filePath) => {
    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

    console.log('');
    console.log('==================================================');
    console.log('ABRIR REPORTE');
    console.log('==================================================');
    console.log(`Link directo: ${fileUrl}`);

    const command = process.platform === 'win32'
      ? `start "" "${filePath}"`
      : process.platform === 'darwin'
        ? `open "${filePath}"`
        : `xdg-open "${filePath}"`;

    exec(command, (error) => {
      if (error) {
        console.log('');
        console.log('No se pudo abrir automáticamente.');
        console.log(`Abre este link manualmente: ${fileUrl}`);
      }
    });
  };

  const printRawList = (title, list) => {
    console.log('');
    console.log('==================================================');
    console.log(title);
    console.log('==================================================');
    console.log(`Total registros: ${list.length}`);
    console.log('');

    if (list.length === 0) {
      console.log('No hay registros para mostrar.');
      return;
    }

    list.forEach((r, index) => {
      const marker = r.isNew ? ' [NUEVO]' : '';
      console.log(`${index + 1}. ${r.scheduled} - ${r.website} - ${r.type} - ${r.user}${marker}`);
    });
  };

  const printPublisherCountsFromRows = (title, rows) => {
    const grouped = {};

    rows.forEach(r => {
      if (!grouped[r.website]) grouped[r.website] = 0;
      grouped[r.website]++;
    });

    const publishers = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

    console.log('');
    console.log('==================================================');
    console.log(title);
    console.log('==================================================');
    console.log(`Cantidad de publicadores: ${publishers.length}`);
    console.log('');

    if (publishers.length === 0) {
      console.log('No hay publicadores para mostrar.');
      return;
    }

    publishers.forEach((name, index) => {
      console.log(`${index + 1}. ${name} (${grouped[name]})`);
    });
  };

  const printFinalGroupedByPublisher = (title, rows, messageHeader) => {
    const grouped = {};

    rows.forEach(row => {
      if (!grouped[row.website]) {
        grouped[row.website] = [];
      }

      grouped[row.website].push(row);
    });

    console.log('');
    console.log('==================================================');
    console.log(title);
    console.log('==================================================');
    console.log('');

    if (Object.keys(grouped).length === 0) {
      console.log('No hay resultado final para mostrar.');
      return;
    }

    for (const publisher of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
      const items = grouped[publisher];

      items.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

      console.log(`${publisher} (${items.length})`);
      console.log(messageHeader);
      console.log('');

      items.forEach(item => {
        const marker = item.isNew ? '  [NUEVO]' : '';
        console.log(`${item.scheduled} - ${item.website} - ${item.type} - ${item.user}${marker}`);
      });

      console.log('');
    }
  };

  const getReportDateForFileName = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  };

  const getTodayStringRD = () => {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santo_Domingo',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    }).format(new Date());
  };

  const getReportsFolderPath = () => {
    const reportsFolder = path.join(__dirname, 'reporte');

    if (!fs.existsSync(reportsFolder)) {
      fs.mkdirSync(reportsFolder, { recursive: true });
    }

    return reportsFolder;
  };

  const getUniqueReportFilePath = (folderPath, baseName, reportDate) => {
    const baseFileName = `${baseName}-${reportDate}`;
    let filePath = path.join(folderPath, `${baseFileName}.html`);

    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    let counter = 1;

    while (true) {
      filePath = path.join(folderPath, `${baseFileName}.${counter}.html`);

      if (!fs.existsSync(filePath)) {
        return filePath;
      }

      counter++;
    }
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

    const pagesBaseUrl = (process.env.PAGES_BASE_URL || '').replace(/\/$/, '');

    if (!pagesBaseUrl) {
      console.log('');
      console.log('==================================================');
      console.log('NO HAY SNAPSHOT ANTERIOR');
      console.log('==================================================');
      console.log('PAGES_BASE_URL no está configurado. Este run será baseline.');
      return [];
    }

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

      console.log(`Snapshot encontrado en Pages.`);
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

  const buildDiff = (currentRows, previousKeys) => {
    const previousSet = new Set(previousKeys);
    const currentSet = new Set(currentRows.map(rowKey));

    const rowsWithStatus = currentRows.map(row => {
      return {
        ...row,
        isNew: !previousSet.has(rowKey(row))
      };
    });

    const newRows = rowsWithStatus.filter(row => row.isNew);

    const removedRows = previousKeys
      .filter(key => !currentSet.has(key))
      .map(keyToRow)
      .filter(row => row.scheduled && row.website && row.type && row.user);

    const sameRows = rowsWithStatus.filter(row => !row.isNew);

    return {
      rowsWithStatus,
      newRows,
      removedRows,
      sameRows
    };
  };

  const generateIntegratedHtmlReportByPublisher = ({
    allRows,
    reminderRows,
    removedRows,
    newRows,
    sameRows,
    generatedAtRD,
    reportDate
  }) => {
    const renderControls = (sectionKey, defaultMessage) => {
      return `
      <div class="message-controls" data-section="${sectionKey}">
        <label>
          Mensaje:
          <select id="message-select-${sectionKey}" onchange="updateSectionMessages('${sectionKey}')">
            <option value="hello" ${defaultMessage === 'hello' ? 'selected' : ''}>hello @ for today we have</option>
            <option value="reminder" ${defaultMessage === 'reminder' ? 'selected' : ''}>last friendly reminder for today @</option>
            <option value="updated" ${defaultMessage === 'updated' ? 'selected' : ''}>List updated @</option>
          </select>
        </label>

        <label class="switch-row">
          <span>Single @</span>
          <input id="mention-switch-${sectionKey}" type="checkbox" onchange="updateSectionMessages('${sectionKey}')">
          <span>Double @ @</span>
        </label>
      </div>
    `;
    };

    const renderSection = (sectionKey, sectionTitle, rows, defaultMessage, options = {}) => {
      const groupedByPublisher = {};

      rows.forEach(row => {
        if (!groupedByPublisher[row.website]) groupedByPublisher[row.website] = [];
        groupedByPublisher[row.website].push(row);
      });

      Object.keys(groupedByPublisher).forEach(publisher => {
        groupedByPublisher[publisher].sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
      });

      const cardsHtml = Object.keys(groupedByPublisher)
        .sort((a, b) => a.localeCompare(b))
        .map((publisher, index) => {
          const items = groupedByPublisher[publisher];

          const copyLines = items.map(item =>
            `${item.scheduled} - ${item.website} - ${item.type} - ${item.user}`
          );

          const visibleLines = items.map(item => {
            const cssClass = item.isNew ? 'line new-line' : 'line';
            const badge = item.isNew ? `<span class="badge-new">NUEVO</span>` : '';
            const removedBadge = options.removedSection ? `<span class="badge-removed">REMOVIDO</span>` : '';

            return `
            <div class="${cssClass}">
              ${escapeHtml(item.scheduled)} - ${escapeHtml(item.website)} - ${escapeHtml(item.type)} - ${escapeHtml(item.user)}
              ${badge}
              ${removedBadge}
            </div>
          `;
          }).join('');

          const messageBlockContent = options.removedSection
            ? visibleLines
            : `
              <div class="hello dynamic-message" data-section="${sectionKey}"></div>
              <br>
              ${visibleLines}
            `;

          return `
          <div class="publisher-card ${options.removedSection ? 'removed-card' : ''}" id="card-${sectionKey}-${index}">
            <div class="publisher-header">
              <div class="publisher-title" onclick="copyPublisher('${sectionKey}', ${index})">
                <span>${escapeHtml(publisher)}</span>
                <span class="count">(${items.length})</span>
                <span class="copied-msg" id="copied-${sectionKey}-${index}">Copiado ✅</span>
              </div>

              <label class="check-area">
                <input type="checkbox" onchange="toggleDone('${sectionKey}', ${index}, this.checked)">
                <span>Done</span>
              </label>
            </div>

            <pre class="copy-lines" id="copy-lines-${sectionKey}-${index}">${escapeHtml(copyLines.join('\n'))}</pre>

            <div class="message-block" onclick="copyPublisher('${sectionKey}', ${index})">
              ${messageBlockContent}
            </div>
          </div>
        `;
        }).join('');

      const emptyMessage = rows.length === 0
        ? `<div class="empty">No hay registros para esta sección.</div>`
        : '';

      const controls = options.removedSection ? '' : renderControls(sectionKey, defaultMessage);

      return `
      <section class="report-section" id="${sectionKey}">
        <div class="section-title-row">
          <h2>${escapeHtml(sectionTitle)}</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('${sectionKey}')">
            Colapsar / Expandir
          </button>
        </div>

        <div class="section-body" id="section-body-${sectionKey}">
          <div class="section-summary">Total registros: ${rows.length}</div>
          ${controls}
          ${emptyMessage}
          ${cardsHtml}
        </div>
      </section>
    `;
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reporte Integrado de Publishers</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f4f6f8;
      color: #111;
      padding: 24px;
      margin: 0;
    }

    h1 { margin: 0 0 4px 0; }

    h2 {
      margin: 0;
      padding-bottom: 8px;
    }

    .subtitle {
      color: #555;
      margin-bottom: 20px;
    }

    .top-summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .summary-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    .summary-number {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .summary-label {
      color: #555;
      font-size: 13px;
    }

    .summary-new .summary-number { color: #0a8f3c; }
    .summary-removed .summary-number { color: #c62828; }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0 22px 0;
    }

    .tab-button {
      border: 1px solid #ccc;
      background: #fff;
      border-radius: 999px;
      padding: 10px 14px;
      cursor: pointer;
      font-weight: bold;
    }

    .tab-button.active {
      background: #111;
      color: #fff;
      border-color: #111;
    }

    .report-section { display: none; }
    .report-section.active { display: block; }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 34px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ddd;
    }

    .collapse-btn {
      border: 1px solid #ccc;
      background: #fff;
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      font-weight: bold;
      white-space: nowrap;
    }

    .collapse-btn:hover {
      background: #f0f7ff;
    }

    .section-body.collapsed {
      display: none;
    }

    .section-summary {
      color: #555;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .message-controls {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      align-items: center;
    }

    .message-controls select {
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid #bbb;
      margin-left: 6px;
      font-weight: bold;
    }

    .switch-row {
      display: flex;
      gap: 8px;
      align-items: center;
      font-weight: bold;
    }

    .switch-row input {
      width: 22px;
      height: 22px;
      cursor: pointer;
    }

    .empty {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 18px;
      color: #555;
      margin-bottom: 16px;
    }

    .publisher-card {
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }

    .publisher-card.done {
      background: #eef9ee;
      border-color: #8bc58b;
    }

    .removed-card {
      border-color: #f0b8b8;
      background: #fffafa;
    }

    .publisher-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .publisher-title {
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      color: #111;
      user-select: none;
    }

    .publisher-title.copied { color: #0066cc; }

    .count {
      color: #666;
      font-size: 14px;
      margin-left: 6px;
    }

    .copied-msg {
      display: none;
      color: #008000;
      font-size: 14px;
      margin-left: 10px;
    }

    .check-area {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 15px;
      cursor: pointer;
      user-select: none;
    }

    .check-area input {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .message-block {
      cursor: pointer;
      padding: 12px;
      background: #fafafa;
      border-radius: 8px;
      border: 1px solid #eee;
      line-height: 1.5;
    }

    .message-block:hover { background: #f0f7ff; }

    .hello { font-weight: bold; }

    .line { margin-bottom: 4px; }

    .new-line {
      color: #0a8f3c;
      font-weight: bold;
      background: #ecfff3;
      border-left: 4px solid #0a8f3c;
      padding: 4px 8px;
      border-radius: 6px;
    }

    .badge-new {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      background: #0a8f3c;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
    }

    .badge-removed {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      background: #c62828;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
    }

    .copy-lines {
      display: none;
      white-space: pre-wrap;
    }

    @media (max-width: 900px) {
      .top-summary {
        grid-template-columns: 1fr 1fr;
      }

      .section-title-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  </style>
</head>

<body>
  <h1>Reporte Integrado de Publishers</h1>
  <div class="subtitle">Generado en RD: ${escapeHtml(generatedAtRD)} | Día: ${escapeHtml(reportDate)}</div>

  <div class="top-summary">
    <div class="summary-card">
      <div class="summary-number">${allRows.length}</div>
      <div class="summary-label">Total reporte completo</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${reminderRows.length}</div>
      <div class="summary-label">Total 5PM en adelante</div>
    </div>

    <div class="summary-card summary-new">
      <div class="summary-number">${newRows.length}</div>
      <div class="summary-label">Agregados nuevos</div>
    </div>

    <div class="summary-card summary-removed">
      <div class="summary-number">${removedRows.length}</div>
      <div class="summary-label">Removidos</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${sameRows.length}</div>
      <div class="summary-label">Sin cambios</div>
    </div>
  </div>

  <div class="tabs">
    <button class="tab-button active" onclick="showTab('todos', this)">Reporte completo (${allRows.length})</button>
    <button class="tab-button" onclick="showTab('5pm', this)">5PM en adelante (${reminderRows.length})</button>
    <button class="tab-button" onclick="showTab('removed', this)">Removidos (${removedRows.length})</button>
  </div>

  ${renderSection(
      'todos',
      '1. Reporte completo del día',
      allRows,
      'hello'
    )}

  ${renderSection(
      '5pm',
      '2. Last friendly reminder - 5PM en adelante',
      reminderRows,
      'reminder'
    )}

  ${renderSection(
      'removed',
      '3. Removidos en esta versión',
      removedRows,
      '',
      { removedSection: true }
    )}

  <script>
    document.getElementById('todos').classList.add('active');

    function getMention(sectionKey) {
      const checked = document.getElementById('mention-switch-' + sectionKey)?.checked;
      return checked ? '@ @' : '@';
    }

    function getMessage(sectionKey) {
      const select = document.getElementById('message-select-' + sectionKey);
      const value = select ? select.value : 'hello';
      const mention = getMention(sectionKey);

      if (value === 'hello') {
        return 'hello ' + mention + ' for today we have';
      }

      if (value === 'reminder') {
        return 'last friendly reminder for today ' + mention;
      }

      if (value === 'updated') {
        return 'List updated ' + mention;
      }

      return 'hello ' + mention + ' for today we have';
    }

    function updateSectionMessages(sectionKey) {
      const message = getMessage(sectionKey);

      document.querySelectorAll('.dynamic-message[data-section="' + sectionKey + '"]').forEach(el => {
        el.innerText = message;
      });
    }

    function showTab(sectionId, button) {
      document.querySelectorAll('.report-section').forEach(section => {
        section.classList.remove('active');
      });

      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });

      document.getElementById(sectionId).classList.add('active');
      button.classList.add('active');
    }

    function toggleSectionBody(sectionKey) {
      const body = document.getElementById('section-body-' + sectionKey);

      if (!body) return;

      body.classList.toggle('collapsed');
    }

    function fallbackCopyText(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }

    async function copyPublisher(sectionKey, index) {
      const lines = document.getElementById('copy-lines-' + sectionKey + '-' + index).innerText;
      const title = document.querySelector('#card-' + sectionKey + '-' + index + ' .publisher-title');
      const copiedMsg = document.getElementById('copied-' + sectionKey + '-' + index);

      let text = lines;

      if (sectionKey !== 'removed') {
        text = getMessage(sectionKey) + '\\n\\n' + lines;
      }

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          fallbackCopyText(text);
        }

        title.classList.add('copied');
        copiedMsg.style.display = 'inline';

        setTimeout(() => {
          copiedMsg.style.display = 'none';
        }, 2000);

      } catch (error) {
        alert('No se pudo copiar automáticamente. Puedes copiar manualmente.');
      }
    }

    function toggleDone(sectionKey, index, checked) {
      const card = document.getElementById('card-' + sectionKey + '-' + index);

      if (checked) {
        card.classList.add('done');
      } else {
        card.classList.remove('done');
      }
    }

    updateSectionMessages('todos');
    updateSectionMessages('5pm');
  </script>
</body>
</html>
`;

    const reportsFolder = getReportsFolderPath();

    const filePath = getUniqueReportFilePath(
      reportsFolder,
      'reporte-publishers-integrado',
      reportDate
    );

    fs.writeFileSync(filePath, html, 'utf8');

    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

    console.log('');
    console.log('==================================================');
    console.log('13. HTML INTEGRADO GENERADO');
    console.log('==================================================');
    console.log(`Archivo creado: ${filePath}`);
    console.log(`Link directo: ${fileUrl}`);

    if (!process.env.CI) {
      openHtmlFile(filePath);
    }
  };

  try {
    console.log('');
    console.log('Entrando al login...');

    await safeGoto('https://dashboard.jewishcontentnetwork.com/admin/login');

    await page.fill('#email', process.env.JCN_USER);
    await page.fill('#password', process.env.JCN_PASS);

    await Promise.all([
      page.waitForTimeout(3000),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(5000);

    console.log('URL después del login:', page.url());

    console.log('Entrando a posts...');

    const postsUrl = 'https://dashboard.jewishcontentnetwork.com/admin/resources/posts';

    await safeGoto(postsUrl);

    if (!page.url().includes('/admin/resources/posts')) {
      console.log('Forzando navegación con window.location...');

      await page.evaluate((url) => {
        window.location.href = url;
      }, postsUrl);

      await page.waitForTimeout(7000);
    }

    console.log('URL actual:', page.url());

    console.log('Esperando tabla...');

    await page.waitForSelector('table tbody tr', {
      timeout: 60000
    });

    let rowCount = 0;

    for (let i = 0; i < 10; i++) {
      rowCount = await page.locator('table tbody tr').count();

      if (rowCount > 0) break;

      console.log(`Esperando filas... intento ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    console.log('');
    console.log('==================================================');
    console.log('1. TABLA DETECTADA');
    console.log('==================================================');
    console.log(`Filas detectadas en la tabla: ${rowCount}`);

    const rows = await page.evaluate(() => {
      const data = [];
      const trs = document.querySelectorAll('table tbody tr');

      trs.forEach(row => {
        const cols = row.querySelectorAll('td');

        if (cols.length < 8) return;

        const scheduled = cols[1]?.innerText.replace(/\n/g, ' ').trim() || '';
        const website = cols[2]?.innerText.replace(/\n/g, ' ').trim() || '';
        const type = cols[3]?.innerText.replace(/\n/g, ' ').trim() || '';
        const user = cols[7]?.innerText.replace(/\n/g, ' ').trim() || '';

        if (!scheduled || !website || !type || !user) return;

        data.push({
          scheduled,
          website,
          type,
          user
        });
      });

      return data;
    });

    printRawList('2. RAW SCRAPING', rows);

    const todayString = getTodayStringRD();

    const rowsToday = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart === todayString;
    });

    const rowsRemovedByDate = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart !== todayString;
    });

    printRawList(`3. FILTRO SOLO HOY (${todayString})`, rowsToday);
    printRawList(`4. REMOVIDOS POR FECHA (NO SON DE HOY ${todayString})`, rowsRemovedByDate);

    printPublisherCountsFromRows('5. PUBLICADORES ENCONTRADOS HOY', rowsToday);
    printPublisherCountsFromRows('6. PUBLICADORES REMOVIDOS POR FECHA', rowsRemovedByDate);

    const rowsFiltered = rowsToday.filter(r =>
      allowedPublishersNormalized.has(normalize(r.website))
    );

    const rowsRemovedByWhitelist = rowsToday.filter(r =>
      !allowedPublishersNormalized.has(normalize(r.website))
    );

    printRawList('7. FILTRO POR TU LISTA', rowsFiltered);
    printRawList('8. REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist);

    printPublisherCountsFromRows('9. PUBLICADORES FINALES DESPUÉS DEL FILTRO', rowsFiltered);
    printPublisherCountsFromRows('10. PUBLICADORES REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist);

    rowsFiltered.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    const reportsFolder = getReportsFolderPath();
    const reportDate = getReportDateForFileName();

    const previousKeys = await loadPreviousSnapshot(reportsFolder, reportDate);

    const {
      rowsWithStatus,
      newRows,
      removedRows,
      sameRows
    } = buildDiff(rowsFiltered, previousKeys);

    rowsWithStatus.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
    removedRows.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    const rowsFilteredAfter5PM = rowsWithStatus.filter(row => isAtOrAfter5PM(row.scheduled));

    printRawList('11. AGREGADOS NUEVOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', newRows);
    printRawList('12. REMOVIDOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', removedRows);

    console.log('');
    console.log('==================================================');
    console.log('RESUMEN DE CAMBIOS');
    console.log('==================================================');
    console.log(`Total actual: ${rowsWithStatus.length}`);
    console.log(`Agregados nuevos: ${newRows.length}`);
    console.log(`Removidos: ${removedRows.length}`);
    console.log(`Sin cambios: ${sameRows.length}`);

    printFinalGroupedByPublisher(
      '13. RESULTADO FINAL AGRUPADO - TODOS',
      rowsWithStatus,
      'hello @ for today we have'
    );

    printFinalGroupedByPublisher(
      '14. RESULTADO FINAL AGRUPADO - 5PM EN ADELANTE',
      rowsFilteredAfter5PM,
      'last friendly reminder @'
    );

    const generatedAtRD = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santo_Domingo',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());

    generateIntegratedHtmlReportByPublisher({
      allRows: rowsWithStatus,
      reminderRows: rowsFilteredAfter5PM,
      removedRows,
      newRows,
      sameRows,
      generatedAtRD,
      reportDate
    });

    saveSnapshot(reportsFolder, reportDate, rowsFiltered);

  } catch (error) {
    console.error('');
    console.error('==================================================');
    console.error('ERROR');
    console.error('==================================================');
    console.error(error.message);

    console.log('');
    console.log('URL donde falló:', page.url());

    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
  }
})();