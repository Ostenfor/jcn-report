const { safeGoto } = require('../utils/navigationUtils');

const SCREENSHOTS_URL = 'https://dashboard.jewishcontentnetwork.com/admin/resources/screenshots';
const SCREENSHOTS_TWOS_URL = 'https://dashboard.jewishcontentnetwork.com/admin/resources/screenshots-twos';
const APPROVED_SCREENSHOTS_URL = 'https://dashboard.jewishcontentnetwork.com/admin/resources/approved-screenshots';

const normalizeHeader = (text) => {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const buildHeaderMap = (headers) => {
  const map = {};

  headers.forEach((header, index) => {
    map[normalizeHeader(header)] = index;
  });

  return map;
};

const findHeaderIndex = (headerMap, candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeHeader(candidate);

    if (Object.prototype.hasOwnProperty.call(headerMap, normalized)) {
      return headerMap[normalized];
    }
  }

  return -1;
};

const emptyAsset = () => ({
  exists: false,
  text: '',
  imageUrl: null,
  videoUrl: null,
  linkUrl: null,
  thumbnailUrl: null
});

const countRowsWithAsset = (rows, assetName) => {
  return rows.filter(row => row[assetName]?.exists).length;
};

const buildScreenshotSummary = (rows) => {
  const mediaCount = countRowsWithAsset(rows, 'media');
  const screenshotCount = countRowsWithAsset(rows, 'screenshot');
  const screenshotTwoCount = countRowsWithAsset(rows, 'screenshotTwo');
  const missingScreenshotCount = rows.length - screenshotCount;

  return {
    totalRows: rows.length,
    mediaCount,
    screenshotCount,
    screenshotTwoCount,
    missingScreenshotCount
  };
};

const printScreenshotSummary = (title, rows) => {
  const summary = buildScreenshotSummary(rows);

  console.log('');
  console.log('==================================================');
  console.log(title);
  console.log('==================================================');
  console.log(`Total registros: ${summary.totalRows}`);
  console.log(`Con media: ${summary.mediaCount}`);
  console.log(`Con screenshot: ${summary.screenshotCount}`);
  console.log(`Sin screenshot: ${summary.missingScreenshotCount}`);
  console.log(`Con screenshot two: ${summary.screenshotTwoCount}`);

  return summary;
};

const getResourceNameFromUrl = (url) => {
  if (url.includes('/screenshots-twos')) return 'screenshots-twos';
  if (url.includes('/approved-screenshots')) return 'approved-screenshots';
  return 'screenshots';
};

const getScheduledDatePart = (row) => {
  return row?.scheduled?.split(',')[0]?.trim() || '';
};

const filterByDate = (rows, dateString) => {
  if (!dateString) return [];
  return rows.filter(row => getScheduledDatePart(row) === dateString);
};

const filterByWhitelist = (rows, allowedPublishersNormalized, normalize) => {
  return rows.filter(row => allowedPublishersNormalized.has(normalize(row.website)));
};

const printMissingScreenshots = (title, rowsMissingScreenshot) => {
  console.log('');
  console.log('==================================================');
  console.log(`${title.toUpperCase()} - FALTAN POR SUBIR`);
  console.log('==================================================');

  if (!rowsMissingScreenshot.length) {
    console.log(`No faltan screenshots en ${title} para tu lista.`);
    return;
  }

  rowsMissingScreenshot.forEach((row, index) => {
    console.log(`${index + 1}. ${row.scheduled} - ${row.website} - ${row.type} - ${row.user}`);
    console.log(`   Media: ${row.media.thumbnailUrl || 'no media url'}`);
    console.log(`   Detail: ${row.detailUrl || 'no detail url'}`);
  });
};

const crawlScreenshots = async ({
  page,
  todayString,
  yesterdayString = null,
  allowedPublishersNormalized,
  normalize,
  url = SCREENSHOTS_URL,
  title = 'screenshots'
}) => {
  const resourceName = getResourceNameFromUrl(url);

  console.log('');
  console.log(`Entrando a ${title}...`);

  await safeGoto(page, url);

  if (!page.url().includes(`/admin/resources/${resourceName}`)) {
    console.log(`Forzando navegación con window.location hacia ${title}...`);

    await page.evaluate((targetUrl) => {
      window.location.href = targetUrl;
    }, url);

    await page.waitForTimeout(7000);
  }

  console.log(`URL actual ${title}:`, page.url());
  console.log(`Esperando tabla de ${title}...`);

  await page.waitForSelector('table tbody tr', { timeout: 60000 });

  let rowCount = 0;

  for (let i = 0; i < 10; i++) {
    rowCount = await page.locator('table tbody tr').count();

    if (rowCount > 0) break;

    console.log(`Esperando filas ${title}... intento ${i + 1}`);
    await page.waitForTimeout(2000);
  }

  const result = await page.evaluate(() => {
    const cleanText = (value) => {
      return String(value || '')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const getAbsoluteUrl = (value) => {
      if (!value) return null;

      try {
        return new URL(value, window.location.origin).href;
      } catch {
        return value;
      }
    };

    const getCellAsset = (cell) => {
      if (!cell) {
        return {
          exists: false,
          text: '',
          imageUrl: null,
          videoUrl: null,
          linkUrl: null,
          thumbnailUrl: null
        };
      }

      const text = cleanText(cell.innerText);
      const img = cell.querySelector('img');
      const video = cell.querySelector('video');
      const source = cell.querySelector('source');
      const link = cell.querySelector('a[href]');

      const imageUrl = img ? getAbsoluteUrl(img.getAttribute('src')) : null;
      const videoUrl = video
        ? getAbsoluteUrl(video.getAttribute('src'))
        : source
          ? getAbsoluteUrl(source.getAttribute('src'))
          : null;
      const videoPoster = video ? getAbsoluteUrl(video.getAttribute('poster')) : null;
      const linkUrl = link ? getAbsoluteUrl(link.getAttribute('href')) : null;

      const backgroundImage = [...cell.querySelectorAll('*')]
        .map(el => window.getComputedStyle(el).backgroundImage)
        .find(bg => bg && bg !== 'none' && bg.includes('url('));

      let backgroundImageUrl = null;

      if (backgroundImage) {
        const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        backgroundImageUrl = match ? getAbsoluteUrl(match[1]) : null;
      }

      const thumbnailUrl = imageUrl || videoPoster || backgroundImageUrl || videoUrl || linkUrl || null;
      const normalizedText = text.toLowerCase();
      const looksEmpty = !thumbnailUrl && (
        text === '' ||
        text === '-' ||
        text === '—' ||
        normalizedText === 'n/a' ||
        normalizedText === 'null'
      );

      return {
        exists: !looksEmpty,
        text,
        imageUrl,
        videoUrl,
        linkUrl,
        thumbnailUrl
      };
    };

    const getDetailUrlFromRow = (tr) => {
      const viewLink =
        tr.querySelector('a[aria-label="View"][href*="/admin/resources/"]') ||
        tr.querySelector('a[dusk$="-view-button"][href*="/admin/resources/"]') ||
        tr.querySelector('a[href*="/admin/resources/screenshots-twos/"]:not([href$="/edit"])') ||
        tr.querySelector('a[href*="/admin/resources/screenshots/"]:not([href$="/edit"])') ||
        tr.querySelector('a[href*="/admin/resources/approved-screenshots/"]:not([href$="/edit"])');

      return viewLink ? getAbsoluteUrl(viewLink.getAttribute('href')) : null;
    };

    const headers = [...document.querySelectorAll('table thead th')]
      .map(th => cleanText(th.innerText));

    const rows = [];
    const trs = [...document.querySelectorAll('table tbody tr')];

    trs.forEach(tr => {
      const cells = [...tr.querySelectorAll('td')];

      rows.push({
        cellsText: cells.map(cell => cleanText(cell.innerText)),
        detailUrl: getDetailUrlFromRow(tr),
        assetsByCell: cells.map(cell => getCellAsset(cell))
      });
    });

    return {
      headers,
      rows
    };
  });

  const headerMap = buildHeaderMap(result.headers);

  const scheduledIndex = findHeaderIndex(headerMap, [
    'Scheduled Time',
    'Scheduled',
    'Scheduled At',
    'Schedule',
    'Date',
    'Post Date'
  ]);

  const publisherIndex = findHeaderIndex(headerMap, [
    'Website',
    'Publisher',
    'Publisher / Website'
  ]);

  const typeIndex = findHeaderIndex(headerMap, [
    'Content Type',
    'Content_Type',
    'CONTENT_TYPE',
    'Type',
    'Channel'
  ]);

  const clientIndex = findHeaderIndex(headerMap, [
    'User',
    'Client',
    'Campaign',
    'Advertiser'
  ]);

  const mediaIndex = findHeaderIndex(headerMap, [
    'Media'
  ]);

  const screenshotIndex = findHeaderIndex(headerMap, [
    'Screenshot',
    'Screenshot One',
    'Screenshot 1'
  ]);

  const screenshotTwoIndex = findHeaderIndex(headerMap, [
    'Screenshot Two',
    'Screenshot 2',
    'Second Screenshot'
  ]);

  const rows = result.rows.map(row => {
    return {
      scheduled: scheduledIndex >= 0 ? row.cellsText[scheduledIndex] || '' : '',
      website: publisherIndex >= 0 ? row.cellsText[publisherIndex] || '' : '',
      type: typeIndex >= 0 ? row.cellsText[typeIndex] || '' : '',
      user: clientIndex >= 0 ? row.cellsText[clientIndex] || '' : '',
      media: mediaIndex >= 0 ? row.assetsByCell[mediaIndex] : emptyAsset(),
      screenshot: screenshotIndex >= 0 ? row.assetsByCell[screenshotIndex] : emptyAsset(),
      screenshotTwo: screenshotTwoIndex >= 0 ? row.assetsByCell[screenshotTwoIndex] : emptyAsset(),
      detailUrl: row.detailUrl,
      rawCells: row.cellsText
    };
  });

  const rowsToday = filterByDate(rows, todayString);
  const rowsYesterday = filterByDate(rows, yesterdayString);
  const rowsRemovedByDate = rows.filter(row => getScheduledDatePart(row) !== todayString);

  const rowsFiltered = filterByWhitelist(rowsToday, allowedPublishersNormalized, normalize);
  const rowsFilteredYesterday = filterByWhitelist(rowsYesterday, allowedPublishersNormalized, normalize);
  const rowsRemovedByWhitelist = rowsToday.filter(row =>
    !allowedPublishersNormalized.has(normalize(row.website))
  );

  const rowsWithScreenshot = rowsFiltered.filter(row => row.screenshot.exists);
  const rowsMissingScreenshot = rowsFiltered.filter(row => !row.screenshot.exists);

  const rowsWithScreenshotYesterday = rowsFilteredYesterday.filter(row => row.screenshot.exists);
  const rowsMissingScreenshotYesterday = rowsFilteredYesterday.filter(row => !row.screenshot.exists);

  console.log('');
  console.log('==================================================');
  console.log(`${title.toUpperCase()} CRAWLER - HEADERS DETECTADOS`);
  console.log('==================================================');
  result.headers.forEach((header, index) => {
    console.log(`${index}. ${header}`);
  });

  console.log('');
  console.log('==================================================');
  console.log(`${title.toUpperCase()} CRAWLER - INDEXES`);
  console.log('==================================================');
  console.log(`Scheduled index: ${scheduledIndex}`);
  console.log(`Website index: ${publisherIndex}`);
  console.log(`Type index: ${typeIndex}`);
  console.log(`Client index: ${clientIndex}`);
  console.log(`Media index: ${mediaIndex}`);
  console.log(`Screenshot index: ${screenshotIndex}`);
  console.log(`Screenshot Two index: ${screenshotTwoIndex}`);

  printScreenshotSummary(`${title.toUpperCase()} - RAW TOTAL`, rows);
  printScreenshotSummary(`${title.toUpperCase()} - SOLO HOY (${todayString})`, rowsToday);

  if (yesterdayString) {
    printScreenshotSummary(`${title.toUpperCase()} - SOLO AYER (${yesterdayString})`, rowsYesterday);
  }

  printScreenshotSummary(`${title.toUpperCase()} - FILTRADO POR TU LISTA`, rowsFiltered);
  printScreenshotSummary(`${title.toUpperCase()} - FILTRADO POR TU LISTA - AYER`, rowsFilteredYesterday);
  printScreenshotSummary(`${title.toUpperCase()} - REMOVIDOS POR TU LISTA`, rowsRemovedByWhitelist);

  printMissingScreenshots(title, rowsMissingScreenshot);

  return {
    rows,
    rowsToday,
    rowsYesterday,
    rowsRemovedByDate,
    rowsFiltered,
    rowsFilteredYesterday,
    rowsRemovedByWhitelist,
    rowsWithScreenshot,
    rowsMissingScreenshot,
    rowsWithScreenshotYesterday,
    rowsMissingScreenshotYesterday,
    summary: {
      raw: buildScreenshotSummary(rows),
      today: buildScreenshotSummary(rowsToday),
      yesterday: buildScreenshotSummary(rowsYesterday),
      filtered: buildScreenshotSummary(rowsFiltered),
      filteredYesterday: buildScreenshotSummary(rowsFilteredYesterday),
      removedByWhitelist: buildScreenshotSummary(rowsRemovedByWhitelist),
      withScreenshot: rowsWithScreenshot.length,
      missingScreenshot: rowsMissingScreenshot.length,
      withScreenshotYesterday: rowsWithScreenshotYesterday.length,
      missingScreenshotYesterday: rowsMissingScreenshotYesterday.length
    },
    rowCount,
    headers: result.headers,
    headerMap,
    indexes: {
      scheduledIndex,
      publisherIndex,
      typeIndex,
      clientIndex,
      mediaIndex,
      screenshotIndex,
      screenshotTwoIndex
    },
    url
  };
};

module.exports = {
  SCREENSHOTS_URL,
  SCREENSHOTS_TWOS_URL,
  APPROVED_SCREENSHOTS_URL,
  crawlScreenshots
};
