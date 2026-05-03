// ==================================================
// MODULE 01 - BOOT
// ==================================================
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { chromium } = require('playwright');
// ==================================================
// END MODULE 01 - BOOT
// ==================================================


// ==================================================
// MODULE 02 - APP START
// ==================================================
(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  // ==================================================
  // END MODULE 02 - APP START
  // ==================================================


    // ==================================================
  // MODULE 03 - PUBLISHERS CONFIG
  // ==================================================
  const publisherConfigRows = [
    {
      publisher: 'KolHaolam',
      group: 'KOL Haolam JCN',
      notes: 'No notes'
    },
    {
      publisher: 'Lakewood Scoop',
      group: 'TLS JCN Ads',
      notes: 'No notes'
    },
    {
      publisher: 'Jewish News 24',
      group: 'Jewish News 24 - JCN',
      notes: 'Dont Send Notification'
    },
    {
      publisher: 'Meaningful Minute',
      group: 'MM /JCN FAMILY',
      notes: 'No notes'
    },
    {
      publisher: 'COL Live',
      group: 'COLlive // JCN',
      notes: 'No notes'
    },
    {
      publisher: 'VINnews (Vos Iz Neias)',
      group: 'Chayala ad group - VIN',
      notes: 'No notes'
    },
    {
      publisher: 'Jewish Breaking News',
      group: 'JBN X JCN NEW GROUP',
      notes: 'No notes'
    },
    {
      publisher: 'Yoilish status',
      group: 'Yoilish/JCN',
      notes: 'No notes'
    },
    {
      publisher: 'SY Alerts',
      group: 'JCN SY 2025',
      notes: 'Status broken link'
    },
    {
      publisher: 'Five Towns Central',
      group: '5T x JCN 2025',
      notes: 'No notes'
    },
    {
      publisher: 'Just My Israel',
      group: 'JustMyIsrael & JCN',
      notes: 'No notes'
    },
    {
      publisher: "N'shei News",
      aliases: ["N'Shei News", 'N’Shei News', 'N’shei News', "N’shei News"],
      group: 'Updated N’shei News X JCN',
      notes: 'No notes'
    },
    {
      publisher: 'Belaaz',
      group: 'Belaaz / JCN UPDATED',
      notes: 'No notes'
    },
    {
      publisher: 'Arutz Sheva',
      group: 'JCN NEW GROUP A7',
      notes: 'only Group / no msg on saturday'
    },
    {
      publisher: 'Chez Chaya',
      group: 'Chef Chaya / JCN',
      notes: 'only Status'
    },
    {
      publisher: 'Kosher.com',
      aliases: ['Kosher. com', 'Kosher com'],
      group: 'Kosher.com ad sales',
      notes: 'only Group'
    },
    {
      publisher: 'Zemel',
      group: 'JD media and Zemel',
      notes: 'No notes'
    },
    {
      publisher: 'The Perlowitz Show',
      group: 'NEW Perlowitz Group JCN',
      notes: 'only Status'
    },
    {
      publisher: 'Mommy Deals',
      group: 'MommyDeals + JCN',
      notes: 'No notes'
    },
    {
      publisher: 'Raizys Cooking',
      aliases: ['Raizy’s Cooking', "Raizy's Cooking"],
      group: 'Raizy’s Cooking / JCN',
      notes: 'only Status'
    },
    {
      publisher: 'Israel Breaking News',
      group: 'Israel Breaking News🇮🇱 & JCN',
      notes: 'No notes'
    },
    {
      publisher: 'Baltimore Jewish Life',
      group: 'Baltimore Jewish Life / JCN',
      notes: 'Pending Status'
    },
    {
      publisher: 'Israel Live News',
      group: 'Israel Live News  x JCN (Yehuda)',
      notes: 'only Group'
    },
    {
      publisher: 'Meira K.',
      aliases: ['Meira K'],
      group: 'Meira K x JCN 2025',
      notes: 'give time in IST time',
      mention: '+972 54-346-8770',
      addIstTime: true
    },
    {
      publisher: 'Efraim Feder in Lakewood Status',
      group: 'JCN Feder 2025',
      notes: 'No notes'
    },
    {
      publisher: 'Matzav',
      group: 'N/A',
      notes: 'the client does not want publisher group'
    },
    {
      publisher: 'Addictive Ads',
      group: 'Addictive CWM',
      notes: 'only publisher group to remind them'
    },
    {
      publisher: 'W365',
      group: 'Klal Media - Jewish Content Network JDN',
      notes: 'No notes'
    },
    {
      publisher: 'BP24',
      aliases: ['BP 24'],
      group: 'Klal Media - Jewish Content Network JDN',
      notes: 'No notes'
    },
    {
      publisher: 'JDN',
      group: 'Klal Media - Jewish Content Network JDN',
      notes: 'No notes'
    },
    {
      publisher: 'Rockland Daily',
      group: 'Klal Media - Jewish Content Network JDN',
      notes: 'No notes'
    },
    {
      publisher: 'Simcha Spot',
      group: 'SimchaSpot Ads - JCN',
      notes: 'No notes'
    }
  ];

  const allowedPublishers = new Set(
    publisherConfigRows.flatMap(row => [
      row.publisher,
      ...(row.aliases || [])
    ])
  );
  // ==================================================
  // END MODULE 03 - PUBLISHERS CONFIG
  // ==================================================


    // ==================================================
  // MODULE 04 - HELPERS
  // ==================================================
  const normalize = (text) => (text || '')
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  const allowedPublishersNormalized = new Set(
    [...allowedPublishers].map(normalize)
  );

  const parseDate = (text) => {
    const cleaned = String(text || '')
      .replace(/\s+(EST|EDT)$/i, '')
      .trim();

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

  const splitNotes = (notes) => {
    const clean = String(notes || '').trim();

    if (!clean) return [];

    if (clean.toLowerCase() === 'no notes') {
      return [];
    }

    return clean
      .split('/')
      .map(note => note.trim())
      .filter(Boolean);
  };

  const publisherConfigMap = new Map();

  publisherConfigRows.forEach(row => {
    const cleanConfig = {
      publisher: row.publisher,
      group: row.group || 'N/A',
      notes: splitNotes(row.notes),
      mention: row.mention || '',
      addIstTime: Boolean(row.addIstTime)
    };

    publisherConfigMap.set(normalize(row.publisher), cleanConfig);

    (row.aliases || []).forEach(alias => {
      publisherConfigMap.set(normalize(alias), cleanConfig);
    });
  });

  const getPublisherConfig = (publisher) => {
    return publisherConfigMap.get(normalize(publisher)) || {
      publisher,
      group: 'N/A',
      notes: [],
      mention: '',
      addIstTime: false
    };
  };

  const getWhatsappGroupName = (publisher) => {
    return getPublisherConfig(publisher).group || 'N/A';
  };

  const getPublisherNotes = (publisher) => {
    return getPublisherConfig(publisher).notes || [];
  };

  const getPublisherMention = (publisher) => {
    return getPublisherConfig(publisher).mention || '';
  };

  const addHoursToAmPmTime = (hourRaw, minuteRaw, ampmRaw, hoursToAdd) => {
    let hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const ampm = String(ampmRaw).toUpperCase();

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const date = new Date(2000, 0, 1, hour, minute);
    date.setHours(date.getHours() + hoursToAdd);

    let newHour = date.getHours();
    const newMinute = String(date.getMinutes()).padStart(2, '0');
    const newAmpm = newHour >= 12 ? 'PM' : 'AM';

    newHour = newHour % 12;
    if (newHour === 0) newHour = 12;

    return `${newHour}:${newMinute} ${newAmpm}`;
  };

  const formatScheduledForPublisher = (scheduledText, publisher) => {
    const config = getPublisherConfig(publisher);

    if (!config.addIstTime) {
      return scheduledText;
    }

    const text = String(scheduledText || '').trim();

    const match = text.match(
      /^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*(EST|EDT)$/i
    );

    if (!match) {
      return scheduledText;
    }

    const [, mm, dd, yyyy, hourRaw, minuteRaw, ampmRaw, tzRaw] = match;

    const originalHour = String(hourRaw).padStart(2, '0');
    const originalMinute = String(minuteRaw).padStart(2, '0');
    const originalAmpm = String(ampmRaw).toUpperCase();
    const originalTz = String(tzRaw).toUpperCase();

    const istTime = addHoursToAmPmTime(
      originalHour,
      originalMinute,
      originalAmpm,
      7
    );

    return `${mm}/${dd}/${yyyy}, ${originalHour}:${originalMinute} ${originalAmpm} ${originalTz} (${istTime} IST)`;
  };

  const formatRowLine = (item) => {
    const scheduled = formatScheduledForPublisher(item.scheduled, item.website);
    return `${scheduled} - ${item.website} - ${item.type} - ${item.user}`;
  };

  const renderNoteLabels = (publisher) => {
    const notes = getPublisherNotes(publisher);

    if (!notes.length) return '';

    return `
      <div class="notes-footer">
        <span class="notes-footer-label">Notes:</span>
        <span class="notes-list">
          ${notes.map(note => `<span class="note-label">${escapeHtml(note)}</span>`).join('')}
        </span>
      </div>
    `;
  };
  // ==================================================
  // END MODULE 04 - HELPERS
  // ==================================================


  // ==================================================
  // MODULE 05 - NAVIGATION
  // ==================================================
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
  // ==================================================
  // END MODULE 05 - NAVIGATION
  // ==================================================


  // ==================================================
  // MODULE 06 - LOCAL OPEN
  // ==================================================
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
  // ==================================================
  // END MODULE 06 - LOCAL OPEN
  // ==================================================


    // ==================================================
  // MODULE 07 - CONSOLE
  // ==================================================
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
      console.log(`${index + 1}. ${formatRowLine(r)}${marker}`);
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

      const mention = getPublisherMention(publisher);
      const finalHeader = mention
        ? messageHeader.replace('@', `@${mention}`)
        : messageHeader;

      console.log(finalHeader);
      console.log('');

      items.forEach(item => {
        const marker = item.isNew ? '  [NUEVO]' : '';
        console.log(`${formatRowLine(item)}${marker}`);
      });

      console.log('');
    }
  };
  // ==================================================
  // END MODULE 07 - CONSOLE
  // ==================================================


  // ==================================================
  // MODULE 08 - FILES
  // ==================================================
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
  // ==================================================
  // END MODULE 08 - FILES
  // ==================================================


  // ==================================================
  // MODULE 09 - SNAPSHOT
  // ==================================================
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
  // ==================================================
  // END MODULE 09 - SNAPSHOT
  // ==================================================


  // ==================================================
  // MODULE 10 - DIFF
  // ==================================================
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
  // ==================================================
  // END MODULE 10 - DIFF
  // ==================================================


    // ==================================================
  // MODULE 11 - HTML
  // ==================================================
  const generateIntegratedHtmlReportByPublisher = ({
    allRows,
    reminderRows,
    removedRows,
    newRows,
    sameRows,
    generatedAtRD,
    reportDate
  }) => {
    const getPublisherCount = (rows) => {
      return new Set(rows.map(row => row.website)).size;
    };

    const totalPublishersCount = getPublisherCount(allRows);

    const renderControls = (sectionKey, defaultMessage) => {
      return `
      <div class="message-controls" data-section="${sectionKey}">
        <div class="control-group">
          <label class="control-label" for="message-select-${sectionKey}">Mensaje:</label>
          <select id="message-select-${sectionKey}" onchange="updateSectionMessages('${sectionKey}')">
            <option value="hello" ${defaultMessage === 'hello' ? 'selected' : ''}>hello @ for today we have</option>
            <option value="reminder" ${defaultMessage === 'reminder' ? 'selected' : ''}>last friendly reminder for today @</option>
            <option value="updated" ${defaultMessage === 'updated' ? 'selected' : ''}>List updated @</option>
          </select>
        </div>

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

      const sectionPublisherCount = Object.keys(groupedByPublisher).length;

      const cardsHtml = Object.keys(groupedByPublisher)
        .sort((a, b) => a.localeCompare(b))
        .map((publisher, index) => {
          const items = groupedByPublisher[publisher];

          const sentKey = `${sectionKey}|||${publisher}`;
          const confirmKey = `${sectionKey}|||${publisher}`;
          const whatsappGroupName = getWhatsappGroupName(publisher);
          const hasWhatsappGroup = whatsappGroupName && whatsappGroupName !== 'N/A';
          const publisherMention = getPublisherMention(publisher);

          const copyLines = items.map(item => formatRowLine(item));

          const visibleLines = items.map(item => {
            const cssClass = item.isNew ? 'line new-line' : 'line';
            const badge = item.isNew ? `<span class="badge-new">NEW</span>` : '';
            const removedBadge = options.removedSection ? `<span class="badge-removed">REMOVIDO</span>` : '';

            return `
              <div class="${cssClass}">
                ${escapeHtml(formatRowLine(item))}
                ${badge}
                ${removedBadge}
              </div>
            `;
          }).join('');

          const messageBlockContent = options.removedSection
            ? visibleLines
            : `
              <div class="hello dynamic-message" data-section="${sectionKey}"></div>
              <div class="message-spacer"></div>
              ${visibleLines}
            `;

          const confirmedCheckbox = options.removedSection ? '' : `
            <label class="header-check confirm-area">
              <input
                id="confirmed-${sectionKey}-${index}"
                type="checkbox"
                onchange="togglePublisherConfirmedByCard('${sectionKey}', ${index}, this.checked)"
              >
              <span>Publisher Confirmed</span>
            </label>
          `;

          const sentCheckbox = options.removedSection ? '' : `
            <label class="header-check sent-area">
              <input
                id="sended-${sectionKey}-${index}"
                type="checkbox"
                onchange="toggleSendedByCard('${sectionKey}', ${index}, this.checked)"
              >
              <span>Sended</span>
            </label>
          `;

          const actionButtons = options.removedSection ? '' : `
            <div class="action-buttons">
              <button class="whatsapp-btn" onclick="openWhatsAppTest(event, '${sectionKey}', ${index})">
                WhatsApp
              </button>

              <button
                class="copy-group-btn ${hasWhatsappGroup ? '' : 'disabled-btn'}"
                onclick="copyWhatsappGroup(event, '${sectionKey}', ${index})"
                ${hasWhatsappGroup ? '' : 'disabled'}
              >
                Copy Group
              </button>
            </div>
          `;

          const notesFooter = renderNoteLabels(publisher);

          const groupFooter = options.removedSection ? '' : `
            <div class="group-footer">
              <span class="group-footer-label">Grupo WhatsApp:</span>
              <span class="group-footer-name">${escapeHtml(whatsappGroupName)}</span>
            </div>
            ${notesFooter}
          `;

          return `
          <div
            class="publisher-card ${options.removedSection ? 'removed-card' : ''}"
            id="card-${sectionKey}-${index}"
            data-section-key="${escapeHtml(sectionKey)}"
            data-card-index="${index}"
            data-sent-key="${escapeHtml(sentKey)}"
            data-confirm-key="${escapeHtml(confirmKey)}"
            data-whatsapp-group="${escapeHtml(whatsappGroupName)}"
            data-mention="${escapeHtml(publisherMention)}"
          >
            <div class="publisher-topbar">
              <div class="publisher-title-wrap">
                <div class="publisher-title" onclick="copyPublisher('${sectionKey}', ${index})">
                  <span>${escapeHtml(publisher)}</span>
                  <span class="count">(${items.length})</span>
                  <span class="copied-msg" id="copied-${sectionKey}-${index}">Copiado ✅</span>
                </div>
              </div>

              <div class="header-checks">
                ${sentCheckbox}
                ${confirmedCheckbox}
              </div>
            </div>

            ${actionButtons}

            <pre class="copy-lines" id="copy-lines-${sectionKey}-${index}">${escapeHtml(copyLines.join('\n'))}</pre>

            <div class="message-block" onclick="copyPublisher('${sectionKey}', ${index})">
              ${messageBlockContent}
            </div>

            ${groupFooter}
          </div>
          `;
        }).join('');

      const emptyMessage = rows.length === 0
        ? `<div class="empty">No hay registros para esta sección.</div>`
        : '';

      const controls = options.removedSection ? '' : renderControls(sectionKey, defaultMessage);

      const sectionProgressBox = options.removedSection
        ? ''
        : `
          <div class="section-progress-box">
            <div class="section-progress-row">
              <div class="section-progress-card progress-confirmed">
                <div class="section-progress-head">
                  <span class="section-progress-number">
                    <span id="confirmed-count-${sectionKey}">0</span>/<span id="confirmed-total-${sectionKey}">${sectionPublisherCount}</span>
                  </span>
                  <span class="section-progress-label">Confirmados</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="confirmed-fill-${sectionKey}"></div>
                </div>
                <div class="progress-mini" id="confirmed-text-${sectionKey}">0%</div>
              </div>

              <div class="section-progress-card progress-sended">
                <div class="section-progress-head">
                  <span class="section-progress-number">
                    <span id="sended-count-${sectionKey}">0</span>/<span id="sended-total-${sectionKey}">${sectionPublisherCount}</span>
                  </span>
                  <span class="section-progress-label">Sended</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" id="sended-fill-${sectionKey}"></div>
                </div>
                <div class="progress-mini" id="sended-text-${sectionKey}">0%</div>
              </div>
            </div>
          </div>
        `;

      const summaryText = options.removedSection
        ? `Total: ${rows.length}`
        : `Total: ${rows.length} | Clientes: ${sectionPublisherCount} | Pendientes: <span id="pending-confirm-count-${sectionKey}">${sectionPublisherCount}</span>`;

      const pendingConfirmBox = options.removedSection
        ? ''
        : `
          <div class="pending-confirm-box">
            <div class="pending-confirm-header">
              <strong>Clientes pendientes por confirmación</strong>
              <button class="small-collapse-btn" onclick="togglePendingBox('${sectionKey}')">
                Colapsar / Expandir
              </button>
            </div>

            <div class="pending-confirm-body" id="pending-confirm-body-${sectionKey}">
              <div class="pending-confirm-list" id="pending-confirm-list-${sectionKey}"></div>
            </div>
          </div>
        `;

      return `
      <section class="report-section" id="${sectionKey}">
        <div class="section-title-row">
          <h2>${escapeHtml(sectionTitle)}</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('${sectionKey}')">
            Colapsar / Expandir
          </button>
        </div>

        <div class="section-body" id="section-body-${sectionKey}">
          <div class="section-summary">${summaryText}</div>
          ${controls}
          ${sectionProgressBox}
          ${pendingConfirmBox}
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
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Reporte Integrado de Publishers</title>

  <style>
    * {
      box-sizing: border-box;
    }

    :root {
      --bg: #0b0f14;
      --bg-soft: #111827;
      --bg-card: #121a24;
      --bg-card-2: #0f172a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --line: #243041;
      --line-soft: #1e293b;
      --accent: #38bdf8;
      --accent-2: #60a5fa;
      --green: #22c55e;
      --green-soft: rgba(34, 197, 94, 0.12);
      --yellow: #f59e0b;
      --yellow-soft: rgba(245, 158, 11, 0.14);
      --red: #ef4444;
      --red-soft: rgba(239, 68, 68, 0.12);
      --purple: #a78bfa;
      --blue-soft: rgba(56, 189, 248, 0.15);
      --shadow: 0 10px 24px rgba(0,0,0,0.28);
      --radius: 16px;
    }

    html {
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      background: var(--bg);
    }

    body {
      font-family: Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(168,85,247,0.06), transparent 24%),
        linear-gradient(180deg, #0b0f14 0%, #0c1118 100%);
      color: var(--text);
      padding: 24px;
      margin: 0;
      font-size: 15px;
      min-height: 100vh;
    }

    h1 {
      margin: 0 0 6px 0;
      font-size: 30px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0.2px;
    }

    h2 {
      margin: 0;
      padding-bottom: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 800;
      color: #ffffff;
    }

    .generated-time {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #111827, #0f172a);
      color: #fff;
      border-radius: 999px;
      padding: 10px 14px;
      margin: 8px 0 20px 0;
      font-size: 14px;
      line-height: 1.2;
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }

    .generated-time span {
      color: #cbd5e1;
      font-weight: bold;
    }

    .generated-time strong {
      color: #ffffff;
      font-weight: 800;
    }

    .top-summary {
      display: grid;
      grid-template-columns: repeat(5, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .summary-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.96), rgba(15,23,42,0.96));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
      min-width: 0;
    }

    .summary-number {
      font-size: 30px;
      font-weight: 800;
      margin-bottom: 6px;
      line-height: 1;
      color: #ffffff;
    }

    .summary-label {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.25;
      font-weight: 600;
    }

    .summary-new .summary-number {
      color: var(--green);
    }

    .summary-removed .summary-number {
      color: var(--red);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 16px 0 22px 0;
    }

    .tab-button {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.88);
      color: var(--text);
      border-radius: 999px;
      padding: 10px 14px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      min-height: 42px;
      touch-action: manipulation;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    }

    .tab-button.active {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      color: #fff;
      border-color: #38bdf8;
    }

    .report-section {
      display: none;
    }

    .report-section.active {
      display: block;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 34px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }

    .collapse-btn {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.9);
      color: #fff;
      border-radius: 999px;
      padding: 9px 14px;
      cursor: pointer;
      font-weight: 700;
      white-space: nowrap;
      font-size: 13px;
      min-height: 40px;
      touch-action: manipulation;
    }

    .collapse-btn:hover,
    .small-collapse-btn:hover {
      background: rgba(30, 41, 59, 0.95);
    }

    .section-body.collapsed {
      display: none;
    }

    .section-summary {
      color: var(--muted);
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 600;
    }

    .message-controls {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(12, 17, 24, 0.96);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      font-size: 13px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .control-label {
      font-weight: 700;
      white-space: nowrap;
      color: var(--text);
    }

    .message-controls select {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-weight: 700;
      font-size: 13px;
      max-width: 320px;
      min-height: 38px;
      cursor: pointer;
      background: var(--bg-soft);
      color: #fff;
      outline: none;
    }

    .switch-row {
      display: flex;
      gap: 6px;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      min-height: 34px;
      cursor: pointer;
      touch-action: manipulation;
      color: var(--text);
    }

    .switch-row input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      margin: 0;
      accent-color: #38bdf8;
    }

    .global-reset-row {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0 14px 0;
    }

    .reset-all-btn {
      border: 1px solid rgba(239,68,68,0.45);
      background: linear-gradient(135deg, #b91c1c, #dc2626);
      color: #fff;
      border-radius: 999px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 800;
      font-size: 13px;
      min-height: 40px;
      touch-action: manipulation;
      box-shadow: 0 10px 20px rgba(185,28,28,0.22);
    }

    .reset-all-btn:hover {
      filter: brightness(1.05);
    }

    .section-progress-box {
      margin-bottom: 14px;
    }

    .section-progress-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .section-progress-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(14,20,30,0.98));
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 12px;
      box-shadow: var(--shadow);
      min-width: 0;
    }

    .section-progress-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .section-progress-number {
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
      color: #ffffff;
      white-space: nowrap;
    }

    .progress-confirmed .section-progress-number {
      color: var(--green);
    }

    .progress-sended .section-progress-number {
      color: var(--accent);
    }

    .section-progress-label {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.2;
      font-weight: 700;
      white-space: nowrap;
    }

    .progress-track {
      width: 100%;
      height: 10px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      width: 0%;
      background: #dc2626;
      border-radius: 999px;
      transition: width 0.25s ease, background 0.25s ease;
      box-shadow: 0 0 12px rgba(255,255,255,0.08);
    }

    .progress-mini {
      margin-top: 8px;
      font-size: 12px;
      color: var(--muted);
      font-weight: 800;
      text-align: right;
    }

    .pending-confirm-box {
      background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.06));
      border: 1px solid rgba(245,158,11,0.35);
      border-radius: 16px;
      padding: 12px 14px;
      margin-bottom: 14px;
      box-shadow: var(--shadow);
    }

    .pending-confirm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .pending-confirm-header strong {
      color: #fde68a;
      font-size: 16px;
      line-height: 1.2;
    }

    .small-collapse-btn {
      border: 1px solid rgba(245,158,11,0.45);
      background: rgba(17,24,39,0.9);
      color: #fde68a;
      border-radius: 999px;
      padding: 7px 12px;
      cursor: pointer;
      font-weight: 700;
      font-size: 12px;
      min-height: 34px;
      touch-action: manipulation;
      white-space: nowrap;
    }

    .pending-confirm-body.collapsed {
      display: none;
    }

    .pending-confirm-list {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .pending-pill {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(245,158,11,0.40);
      color: #fde68a;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 700;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
    }

    .empty {
      background: var(--bg-card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 18px;
      color: var(--muted);
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .publisher-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(15,23,42,0.98));
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 18px;
      box-shadow: var(--shadow);
    }

    .publisher-card.sended {
      border-color: rgba(56,189,248,0.45);
      background: linear-gradient(180deg, rgba(11,31,48,0.98), rgba(15,23,42,0.98));
    }

    .publisher-card.confirmed {
      border-color: rgba(34,197,94,0.45);
      background: linear-gradient(180deg, rgba(12,36,24,0.98), rgba(15,23,42,0.98));
    }

    .removed-card {
      border-color: rgba(239,68,68,0.45);
      background: linear-gradient(180deg, rgba(42,18,24,0.98), rgba(20,12,18,0.98));
    }

    .publisher-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 14px;
    }

    .publisher-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .publisher-title {
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
      color: #ffffff;
      user-select: none;
      line-height: 1.25;
      touch-action: manipulation;
    }

    .publisher-title.copied {
      color: #60a5fa;
    }

    .count {
      color: var(--muted);
      font-size: 14px;
      margin-left: 6px;
    }

    .copied-msg {
      display: none;
      color: var(--green);
      font-size: 14px;
      margin-left: 10px;
    }

    .header-checks {
      display: flex;
      flex-wrap: nowrap;
      gap: 18px;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .header-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: 34px;
    }

    .header-check input {
      width: 22px;
      height: 22px;
      margin: 0;
      cursor: pointer;
      flex-shrink: 0;
      accent-color: #38bdf8;
    }

    .sent-area {
      color: var(--accent);
    }

    .confirm-area {
      color: var(--green);
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
    }

    .whatsapp-btn,
    .copy-group-btn {
      border-radius: 999px;
      padding: 10px 16px;
      cursor: pointer;
      font-weight: 800;
      font-size: 14px;
      min-height: 42px;
      touch-action: manipulation;
      border: 1px solid var(--line);
      box-shadow: 0 8px 18px rgba(0,0,0,0.18);
    }

    .whatsapp-btn {
      border-color: rgba(34,197,94,0.50);
      background: rgba(34,197,94,0.12);
      color: #86efac;
    }

    .whatsapp-btn:hover {
      background: rgba(34,197,94,0.18);
    }

    .copy-group-btn {
      border-color: rgba(96,165,250,0.45);
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
    }

    .copy-group-btn:hover {
      background: rgba(59,130,246,0.20);
    }

    .disabled-btn,
    .disabled-btn:hover {
      opacity: 0.45;
      cursor: not-allowed;
      background: rgba(255,255,255,0.05);
      color: #94a3b8;
      border-color: var(--line);
    }

    .message-block {
      cursor: pointer;
      padding: 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 14px;
      border: 1px solid var(--line-soft);
      line-height: 1.45;
      font-size: 15px;
      overflow-wrap: anywhere;
      word-break: normal;
      touch-action: manipulation;
      color: var(--text);
    }

    .message-block:hover {
      background: rgba(59,130,246,0.06);
      border-color: rgba(59,130,246,0.25);
    }

    .hello {
      font-weight: 800;
      font-size: 16px;
      line-height: 1.25;
      color: #ffffff;
    }

    .message-spacer {
      height: 10px;
    }

    .line {
      margin-bottom: 6px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      color: #e5e7eb;
    }

    .new-line {
      color: #bbf7d0;
      font-weight: 700;
      background: rgba(34,197,94,0.10);
      border-left: 4px solid var(--green);
      padding: 6px 9px;
      border-radius: 8px;
    }

    .badge-new {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--green);
      color: #08130c;
      font-size: 11px;
      font-weight: 800;
      vertical-align: middle;
    }

    .badge-removed {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--red);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      vertical-align: middle;
    }

    .group-footer {
      margin-top: 12px;
      padding: 11px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px dashed #334155;
      border-radius: 12px;
      line-height: 1.35;
      color: var(--text);
    }

    .group-footer-label {
      color: var(--muted);
      font-weight: 700;
      margin-right: 6px;
    }

    .group-footer-name {
      color: #a7f3d0;
      font-weight: 800;
    }

    .notes-footer {
      margin-top: 10px;
      padding: 11px 12px;
      background: rgba(59,130,246,0.06);
      border: 1px dashed rgba(96,165,250,0.35);
      border-radius: 12px;
      line-height: 1.35;
      color: var(--text);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .notes-footer-label {
      color: #bfdbfe;
      font-weight: 800;
      margin-right: 2px;
    }

    .notes-list {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .note-label {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(59,130,246,0.18);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid rgba(96,165,250,0.35);
      white-space: nowrap;
    }

    .copy-lines {
      display: none;
      white-space: pre-wrap;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translateX(-50%);
      max-width: calc(100% - 24px);
      background: rgba(15,23,42,0.96);
      color: #fff;
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.35;
      z-index: 9999;
      box-shadow: var(--shadow);
      border: 1px solid var(--line);
      display: none;
      text-align: center;
    }

    .toast.show {
      display: block;
    }

    .toast strong {
      color: #93c5fd;
    }

    @media (max-width: 900px) {
      body {
        padding: 12px;
        font-size: 14px;
      }

      h1 {
        font-size: 22px;
      }

      h2 {
        font-size: 18px;
      }

      .generated-time {
        font-size: 12px;
        padding: 8px 11px;
        margin-bottom: 14px;
      }

      .top-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }

      .summary-card {
        padding: 12px;
      }

      .summary-number {
        font-size: 22px;
      }

      .summary-label {
        font-size: 11px;
      }

      .global-reset-row {
        justify-content: stretch;
      }

      .reset-all-btn {
        width: 100%;
        font-size: 12px;
        min-height: 36px;
      }

      .section-progress-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .section-progress-card {
        padding: 10px;
      }

      .section-progress-head {
        gap: 6px;
        margin-bottom: 8px;
      }

      .section-progress-number {
        font-size: 18px;
      }

      .section-progress-label {
        font-size: 11px;
      }

      .progress-track {
        height: 9px;
      }

      .progress-mini {
        margin-top: 6px;
        font-size: 11px;
      }

      .tabs {
        gap: 6px;
        margin: 12px 0 16px 0;
      }

      .tab-button {
        padding: 8px 10px;
        font-size: 12px;
        min-height: 38px;
      }

      .section-title-row {
        margin-top: 22px;
        margin-bottom: 10px;
        gap: 8px;
        align-items: flex-start;
      }

      .collapse-btn {
        padding: 8px 10px;
        font-size: 12px;
        min-height: 36px;
      }

      .section-summary {
        font-size: 13px;
        margin-bottom: 6px;
      }

      .message-controls {
        top: 0;
        padding: 8px 10px;
        gap: 8px;
        font-size: 12px;
      }

      .control-group {
        width: 100%;
        flex: 1 1 100%;
      }

      .control-label {
        font-size: 12px;
      }

      .message-controls select {
        flex: 1;
        max-width: none;
        min-width: 0;
        font-size: 12px;
        padding: 6px 8px;
        min-height: 36px;
      }

      .switch-row {
        font-size: 12px;
        min-height: 30px;
      }

      .pending-confirm-box {
        padding: 10px 10px;
        margin-bottom: 12px;
      }

      .pending-confirm-header {
        align-items: flex-start;
      }

      .pending-confirm-header strong {
        font-size: 15px;
      }

      .pending-pill {
        font-size: 12px;
        padding: 6px 10px;
      }

      .small-collapse-btn {
        font-size: 11px;
        min-height: 32px;
      }

      .publisher-card {
        padding: 14px;
        margin-bottom: 14px;
      }

      .publisher-topbar {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .publisher-title {
        font-size: 16px;
      }

      .count {
        font-size: 12px;
      }

      .header-checks {
        justify-content: flex-start;
        align-items: center;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 18px;
        width: 100%;
      }

      .header-check {
        font-size: 12px;
        min-height: 30px;
      }

      .header-check input {
        width: 20px;
        height: 20px;
      }

      .action-buttons {
        gap: 10px;
      }

      .whatsapp-btn,
      .copy-group-btn {
        font-size: 12px;
        padding: 9px 13px;
        min-height: 40px;
      }

      .message-block {
        padding: 10px;
        font-size: 13px;
        line-height: 1.4;
      }

      .hello {
        font-size: 15px;
      }

      .group-footer,
      .notes-footer {
        font-size: 12px;
        padding: 8px 10px;
      }

      .note-label {
        font-size: 10px;
        padding: 3px 8px;
      }

      .line {
        font-size: 13px;
        line-height: 1.35;
      }

      .new-line {
        padding: 5px 7px;
        border-left-width: 3px;
        border-radius: 6px;
      }

      .badge-new,
      .badge-removed {
        font-size: 9px;
        padding: 2px 5px;
        margin-left: 5px;
      }

      .toast {
        bottom: 14px;
        font-size: 13px;
        padding: 10px 12px;
      }
    }

    @media (max-width: 430px) {
      body {
        padding: 10px;
      }

      h1 {
        font-size: 20px;
      }

      h2 {
        font-size: 17px;
      }

      .top-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .summary-card {
        padding: 10px;
      }

      .summary-number {
        font-size: 20px;
      }

      .summary-label {
        font-size: 10px;
      }

      .tab-button {
        font-size: 11px;
        padding: 7px 9px;
      }

      .message-controls {
        padding: 8px;
      }

      .section-progress-row {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .section-progress-number {
        font-size: 17px;
      }

      .section-progress-label {
        font-size: 10px;
      }

      .header-checks {
        gap: 14px;
        flex-wrap: nowrap;
      }

      .header-check {
        font-size: 11px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .whatsapp-btn,
      .copy-group-btn {
        width: 100%;
      }

      .message-block {
        font-size: 12.5px;
      }

      .hello {
        font-size: 14px;
      }

      .line {
        font-size: 12.5px;
      }
    }
  </style>
</head>

<body>
  <h1>Reporte Integrado de Publishers</h1>

  <div class="generated-time">
    <span>Generado a las:</span>
    <strong>${escapeHtml(generatedAtRD)}</strong>
  </div>

  <div class="top-summary">
    <div class="summary-card">
      <div class="summary-number">${allRows.length}</div>
      <div class="summary-label">Publicaciones</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${totalPublishersCount}</div>
      <div class="summary-label">Clientes total día</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${reminderRows.length}</div>
      <div class="summary-label">5PM en adelante</div>
    </div>

    <div class="summary-card summary-new">
      <div class="summary-number">${newRows.length}</div>
      <div class="summary-label">Agregados nuevos</div>
    </div>

    <div class="summary-card summary-removed">
      <div class="summary-number">${removedRows.length}</div>
      <div class="summary-label">Removidos</div>
    </div>
  </div>

  <div class="global-reset-row">
    <button class="reset-all-btn" onclick="resetAllTodayProgress()">
      Reset todo el día
    </button>
  </div>

  <div class="tabs">
    <button class="tab-button active" onclick="showTab('todos', this)">Reporte completo (${allRows.length})</button>
    <button class="tab-button" onclick="showTab('after5pm', this)">5PM en adelante (${reminderRows.length})</button>
    <button class="tab-button" onclick="showTab('removed', this)">Removidos (${removedRows.length})</button>
  </div>

  ${renderSection(
    'todos',
    '1. Reporte completo del día',
    allRows,
    'hello'
  )}

  ${renderSection(
    'after5pm',
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

  <div class="toast" id="toast"></div>

  <script>
    const REPORT_DATE = ${JSON.stringify(reportDate)};
    const STORAGE_VERSION = 'v3';

    const SENDED_PREFIX = 'jcn:' + STORAGE_VERSION + ':sended:' + REPORT_DATE + ':';
    const CONFIRMED_PREFIX = 'jcn:' + STORAGE_VERSION + ':publisher-confirmed:' + REPORT_DATE + ':';

    document.getElementById('todos').classList.add('active');

    function escapeForHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function getMention(sectionKey) {
      const checked = document.getElementById('mention-switch-' + sectionKey)?.checked;
      return checked ? '@ @' : '@';
    }

    function getMessage(sectionKey, mentionOverride = '') {
      const select = document.getElementById('message-select-' + sectionKey);
      const value = select ? select.value : 'hello';

      const mention = mentionOverride
        ? '@' + mentionOverride
        : getMention(sectionKey);

      if (value === 'hello') return 'hello ' + mention + ' for today we have';
      if (value === 'reminder') return 'last friendly reminder for today ' + mention;
      if (value === 'updated') return 'List updated ' + mention;

      return 'hello ' + mention + ' for today we have';
    }

    function updateSectionMessages(sectionKey) {
      document.querySelectorAll('.dynamic-message[data-section="' + sectionKey + '"]').forEach(el => {
        const card = el.closest('.publisher-card');
        const mentionOverride = card ? card.dataset.mention || '' : '';
        el.innerText = getMessage(sectionKey, mentionOverride);
      });
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      if (!toast) return;

      toast.innerHTML = message;
      toast.classList.add('show');

      clearTimeout(window.__toastTimer);

      window.__toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
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

      if (sectionId !== 'removed') {
        updateSectionMessages(sectionId);
        updateSectionStatus(sectionId);
      }
    }

    function toggleSectionBody(sectionKey) {
      const body = document.getElementById('section-body-' + sectionKey);
      if (!body) return;
      body.classList.toggle('collapsed');
    }

    function togglePendingBox(sectionKey) {
      const body = document.getElementById('pending-confirm-body-' + sectionKey);
      if (!body) return;
      body.classList.toggle('collapsed');
    }

    function resetAllTodayProgress() {
      const ok = confirm('¿Seguro que quieres borrar todos los checkmarks de hoy?');

      if (!ok) return;

      Object.keys(localStorage)
        .filter(key =>
          key.startsWith(SENDED_PREFIX) ||
          key.startsWith(CONFIRMED_PREFIX) ||
          key.startsWith('jcn:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v1:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v1:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v2:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v2:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v3:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v3:publisher-confirmed:' + REPORT_DATE + ':')
        )
        .forEach(key => localStorage.removeItem(key));

      document.querySelectorAll('.publisher-card').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('sended-' + sectionKey + '-' + index, false);
        setCheckboxState('confirmed-' + sectionKey + '-' + index, false);

        card.classList.remove('sended');
        card.classList.remove('confirmed');
      });

      updateAllSectionStatuses();
      showToast('Todos los checkmarks de hoy fueron reseteados.');
    }

    function getCard(sectionKey, index) {
      return document.getElementById('card-' + sectionKey + '-' + index);
    }

    function getWhatsappGroupFromCard(sectionKey, index) {
      const card = getCard(sectionKey, index);
      if (!card) return 'N/A';
      return card.dataset.whatsappGroup || 'N/A';
    }

    function openWhatsAppTest(event, sectionKey, index) {
      event.stopPropagation();

      const groupName = getWhatsappGroupFromCard(sectionKey, index);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (groupName && groupName !== 'N/A') {
        showToast('Busca este grupo:<br><strong>' + groupName + '</strong>');
      } else {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
      }

      if (isMobile) {
        window.location.href = 'whatsapp://send';
        return;
      }

      window.open('https://web.whatsapp.com/', '_blank');
    }

    function setCheckboxState(id, checked) {
      const checkbox = document.getElementById(id);
      if (checkbox) checkbox.checked = checked;
    }

    function updateAllSectionStatuses() {
      updateSectionStatus('todos');
      updateSectionStatus('after5pm');
    }

    function applySendedState(sentKey, checked) {
      document.querySelectorAll('[data-sent-key="' + CSS.escape(sentKey) + '"]').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('sended-' + sectionKey + '-' + index, checked);

        if (checked) {
          card.classList.add('sended');
        } else {
          card.classList.remove('sended');
        }
      });

      updateAllSectionStatuses();
    }

    function applyConfirmedState(confirmKey, checked) {
      document.querySelectorAll('[data-confirm-key="' + CSS.escape(confirmKey) + '"]').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('confirmed-' + sectionKey + '-' + index, checked);

        if (checked) {
          card.classList.add('confirmed');
        } else {
          card.classList.remove('confirmed');
        }
      });

      updateAllSectionStatuses();
    }

    function toggleSendedByCard(sectionKey, index, checked) {
      const card = getCard(sectionKey, index);
      if (!card) return;

      const sentKey = card.dataset.sentKey;

      if (checked) {
        localStorage.setItem(SENDED_PREFIX + sentKey, '1');
      } else {
        localStorage.removeItem(SENDED_PREFIX + sentKey);
      }

      applySendedState(sentKey, checked);
    }

    function togglePublisherConfirmedByCard(sectionKey, index, checked) {
      const card = getCard(sectionKey, index);
      if (!card) return;

      const confirmKey = card.dataset.confirmKey;

      if (checked) {
        localStorage.setItem(CONFIRMED_PREFIX + confirmKey, '1');
      } else {
        localStorage.removeItem(CONFIRMED_PREFIX + confirmKey);
      }

      applyConfirmedState(confirmKey, checked);
    }

    function markSendedAfterCopy(sectionKey, index) {
      const card = getCard(sectionKey, index);
      if (!card) return;

      const sentKey = card.dataset.sentKey;

      localStorage.setItem(SENDED_PREFIX + sentKey, '1');
      applySendedState(sentKey, true);
    }

    function getProgressColor(progressPercent) {
      if (progressPercent < 35) return '#ef4444';
      if (progressPercent < 70) return '#f59e0b';
      if (progressPercent < 90) return '#eab308';
      return '#22c55e';
    }

    function getProgressColorSended(progressPercent) {
      if (progressPercent < 35) return '#38bdf8';
      if (progressPercent < 70) return '#3b82f6';
      if (progressPercent < 90) return '#2563eb';
      return '#14b8a6';
    }

    function updateSectionStatus(sectionKey) {
      const section = document.getElementById(sectionKey);
      if (!section) return;

      const cards = section.querySelectorAll('.publisher-card');
      const totalClients = cards.length;

      let confirmedClients = 0;
      let sendedClients = 0;
      const pendingPublishers = [];

      cards.forEach(card => {
        const confirmKey = card.dataset.confirmKey;
        const sentKey = card.dataset.sentKey;

        const isConfirmed = localStorage.getItem(CONFIRMED_PREFIX + confirmKey) === '1';
        const isSended = localStorage.getItem(SENDED_PREFIX + sentKey) === '1';

        if (isConfirmed) {
          confirmedClients += 1;
        } else {
          const title = card.querySelector('.publisher-title span');
          const publisherName = title ? title.innerText.trim() : 'Unknown publisher';
          pendingPublishers.push(publisherName);
        }

        if (isSended) {
          sendedClients += 1;
        }
      });

      const confirmedPercent = totalClients === 0
        ? 0
        : Math.round((confirmedClients / totalClients) * 100);

      const sendedPercent = totalClients === 0
        ? 0
        : Math.round((sendedClients / totalClients) * 100);

      const pendingCounter = document.getElementById('pending-confirm-count-' + sectionKey);
      if (pendingCounter) pendingCounter.innerText = pendingPublishers.length;

      const list = document.getElementById('pending-confirm-list-' + sectionKey);
      if (list) {
        if (pendingPublishers.length === 0) {
          list.innerHTML = '<span class="pending-pill">Todo confirmado ✅</span>';
        } else {
          list.innerHTML = pendingPublishers
            .map(name => '<span class="pending-pill">' + escapeForHtml(name) + '</span>')
            .join('');
        }
      }

      const confirmedCount = document.getElementById('confirmed-count-' + sectionKey);
      const confirmedTotal = document.getElementById('confirmed-total-' + sectionKey);
      const confirmedFill = document.getElementById('confirmed-fill-' + sectionKey);
      const confirmedText = document.getElementById('confirmed-text-' + sectionKey);

      if (confirmedCount) confirmedCount.innerText = confirmedClients;
      if (confirmedTotal) confirmedTotal.innerText = totalClients;

      if (confirmedFill) {
        confirmedFill.style.width = confirmedPercent + '%';
        confirmedFill.style.background = getProgressColor(confirmedPercent);
      }

      if (confirmedText) confirmedText.innerText = confirmedPercent + '%';

      const sendedCount = document.getElementById('sended-count-' + sectionKey);
      const sendedTotal = document.getElementById('sended-total-' + sectionKey);
      const sendedFill = document.getElementById('sended-fill-' + sectionKey);
      const sendedText = document.getElementById('sended-text-' + sectionKey);

      if (sendedCount) sendedCount.innerText = sendedClients;
      if (sendedTotal) sendedTotal.innerText = totalClients;

      if (sendedFill) {
        sendedFill.style.width = sendedPercent + '%';
        sendedFill.style.background = getProgressColorSended(sendedPercent);
      }

      if (sendedText) sendedText.innerText = sendedPercent + '%';
    }

    function restoreSavedStates() {
      document.querySelectorAll('.publisher-card').forEach(card => {
        const sentKey = card.dataset.sentKey;
        const confirmKey = card.dataset.confirmKey;

        if (sentKey && localStorage.getItem(SENDED_PREFIX + sentKey) === '1') {
          applySendedState(sentKey, true);
        }

        if (confirmKey && localStorage.getItem(CONFIRMED_PREFIX + confirmKey) === '1') {
          applyConfirmedState(confirmKey, true);
        }
      });

      updateAllSectionStatuses();
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

    async function copyTextToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
    }

    async function copyWhatsappGroup(event, sectionKey, index) {
      event.stopPropagation();

      const groupName = getWhatsappGroupFromCard(sectionKey, index);

      if (!groupName || groupName === 'N/A') {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
        return;
      }

      try {
        await copyTextToClipboard(groupName);
        showToast('Grupo copiado:<br><strong>' + groupName + '</strong>');
      } catch (error) {
        alert('No se pudo copiar el grupo automáticamente.');
      }
    }

    async function copyPublisher(sectionKey, index) {
      const lines = document.getElementById('copy-lines-' + sectionKey + '-' + index).innerText;
      const title = document.querySelector('#card-' + sectionKey + '-' + index + ' .publisher-title');
      const copiedMsg = document.getElementById('copied-' + sectionKey + '-' + index);

      let text = lines;

      if (sectionKey !== 'removed') {
        const card = getCard(sectionKey, index);
        const mentionOverride = card ? card.dataset.mention || '' : '';
        text = getMessage(sectionKey, mentionOverride) + '\\n\\n' + lines;
      }

      try {
        await copyTextToClipboard(text);

        if (sectionKey !== 'removed') {
          markSendedAfterCopy(sectionKey, index);
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

    updateSectionMessages('todos');
    updateSectionMessages('after5pm');
    restoreSavedStates();
    updateAllSectionStatuses();
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
  // ==================================================
  // END MODULE 11 - HTML
  // ==================================================


  // ==================================================
  // MODULE 12 - MAIN
  // ==================================================
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
    // ==================================================
    // END MODULE 12 - MAIN
    // ==================================================


    // ==================================================
    // MODULE 13 - CLEANUP
    // ==================================================
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
  // ==================================================
  // END MODULE 13 - CLEANUP
  // ==================================================
})();