const {
  safeGoto
} = require('../utils/navigationUtils');
const {
  shouldStopAfterPage
} = require('../utils/paginationUtils');
const {
  assertRequiredIndexes
} = require('../utils/validationUtils');

const POSTS_URL = 'https://dashboard.jewishcontentnetwork.com/admin/resources/posts';

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

const crawlPosts = async (page, { oldestDateString = '' } = {}) => {
  console.log('');
  console.log('Entrando a posts...');

  await safeGoto(page, POSTS_URL);

  if (!page.url().includes('/admin/resources/posts')) {
    console.log('Forzando navegación con window.location hacia posts...');

    await page.evaluate((targetUrl) => {
      window.location.href = targetUrl;
    }, POSTS_URL);

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

    console.log(`Esperando filas posts... intento ${i + 1}`);
    await page.waitForTimeout(2000);
  }

  console.log('');
  console.log('==================================================');
  console.log('1. TABLA DETECTADA');
  console.log('==================================================');
  console.log(`Filas detectadas en la tabla: ${rowCount}`);

  const extractCurrentPostsTable = async () => page.evaluate(() => {
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

      const imageUrl = img
        ? getAbsoluteUrl(img.getAttribute('src'))
        : null;

      const videoUrl = video
        ? getAbsoluteUrl(video.getAttribute('src'))
        : source
          ? getAbsoluteUrl(source.getAttribute('src'))
          : null;

      const videoPoster = video
        ? getAbsoluteUrl(video.getAttribute('poster'))
        : null;

      const linkUrl = link
        ? getAbsoluteUrl(link.getAttribute('href'))
        : null;

      const backgroundImage = [...cell.querySelectorAll('*')]
        .map(el => window.getComputedStyle(el).backgroundImage)
        .find(bg => bg && bg !== 'none' && bg.includes('url('));

      let backgroundImageUrl = null;

      if (backgroundImage) {
        const match = backgroundImage.match(/url\(["']?(.*?)["']?\)/);
        backgroundImageUrl = match ? getAbsoluteUrl(match[1]) : null;
      }

      const thumbnailUrl =
        imageUrl ||
        videoPoster ||
        backgroundImageUrl ||
        videoUrl ||
        linkUrl ||
        null;

      const normalizedText = text.toLowerCase();

      const looksEmpty =
        !thumbnailUrl &&
        (
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
        tr.querySelector('a[aria-label="View"][href*="/admin/resources/posts/"]') ||
        tr.querySelector('a[dusk$="-view-button"][href*="/admin/resources/posts/"]') ||
        tr.querySelector('a[href*="/admin/resources/posts/"]:not([href$="/edit"])');

      return viewLink
        ? getAbsoluteUrl(viewLink.getAttribute('href'))
        : null;
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

  const result = await extractCurrentPostsTable();
  const seenRows = new Set(
    result.rows.map(row => row.detailUrl || row.cellsText.join('|||'))
  );
  let crawledPageCount = 1;

  for (let pageNumber = 2; pageNumber <= 100; pageNumber++) {
    if (shouldStopAfterPage({
      headers: result.headers,
      rows: result.rows.slice(-75),
      oldestDateString
    })) {
      console.log(`posts: se alcanzaron fechas anteriores a ${oldestDateString}.`);
      break;
    }

    const nextButton = page.locator('button[dusk="next"]:visible, button[rel="next"]:visible').first();

    if (await nextButton.count() === 0 || await nextButton.isDisabled()) {
      break;
    }

    const previousTableText = await page.locator('table tbody').innerText();
    await nextButton.click();

    try {
      await page.waitForFunction(previousText => {
        const tbody = document.querySelector('table tbody');
        return tbody && tbody.innerText !== previousText;
      }, previousTableText, { timeout: 30000 });
    } catch {
      console.log(`La página ${pageNumber} de posts no cambió; se detiene la paginación.`);
      break;
    }

    const pageResult = await extractCurrentPostsTable();
    let newRowsOnPage = 0;

    pageResult.rows.forEach(row => {
      const key = row.detailUrl || row.cellsText.join('|||');
      if (seenRows.has(key)) return;
      seenRows.add(key);
      result.rows.push(row);
      newRowsOnPage += 1;
    });

    crawledPageCount += 1;
    console.log(`posts: página ${pageNumber}, ${newRowsOnPage} filas nuevas.`);

    if (newRowsOnPage === 0) break;
  }

  rowCount = result.rows.length;
  console.log(`posts: ${crawledPageCount} páginas y ${rowCount} filas revisadas.`);

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

  const mediaIndex = findHeaderIndex(headerMap, [
    'Media'
  ]);

  const messageIndex = findHeaderIndex(headerMap, [
    'Message',
    'Caption',
    'Text',
    'Post Text'
  ]);

  const clientIndex = findHeaderIndex(headerMap, [
    'User',
    'Client',
    'Campaign',
    'Advertiser'
  ]);

  assertRequiredIndexes({
    source: 'Past Due Posts',
    headers: result.headers,
    indexes: {
      scheduled: scheduledIndex,
      publisher: publisherIndex,
      type: typeIndex,
      client: clientIndex
    }
  });

  const rows = result.rows.map(row => {
    return {
      scheduled: scheduledIndex >= 0 ? row.cellsText[scheduledIndex] || '' : '',
      website: publisherIndex >= 0 ? row.cellsText[publisherIndex] || '' : '',
      type: typeIndex >= 0 ? row.cellsText[typeIndex] || '' : '',
      user: clientIndex >= 0 ? row.cellsText[clientIndex] || '' : '',

      media: mediaIndex >= 0
        ? row.assetsByCell[mediaIndex]
        : emptyAsset(),

      message: messageIndex >= 0
        ? row.cellsText[messageIndex] || ''
        : '',

      detailUrl: row.detailUrl,
      rawCells: row.cellsText
    };
  });

  console.log('');
  console.log('==================================================');
  console.log('POSTS CRAWLER - HEADERS DETECTADOS');
  console.log('==================================================');

  result.headers.forEach((header, index) => {
    console.log(`${index}. ${header}`);
  });

  console.log('');
  console.log('==================================================');
  console.log('POSTS CRAWLER - INDEXES');
  console.log('==================================================');
  console.log(`Scheduled index: ${scheduledIndex}`);
  console.log(`Website index: ${publisherIndex}`);
  console.log(`Type index: ${typeIndex}`);
  console.log(`Media index: ${mediaIndex}`);
  console.log(`Message index: ${messageIndex}`);
  console.log(`Client index: ${clientIndex}`);

  console.log('');
  console.log('==================================================');
  console.log('POSTS CRAWLER - MEDIA SUMMARY');
  console.log('==================================================');
  console.log(`Total registros: ${rows.length}`);
  console.log(`Con media: ${rows.filter(row => row.media?.exists).length}`);
  console.log(`Sin media: ${rows.filter(row => !row.media?.exists).length}`);
  console.log(`Con detail URL: ${rows.filter(row => row.detailUrl).length}`);

  return {
    rows,
    rowCount,
    crawledPageCount,
    headers: result.headers,
    headerMap,
    indexes: {
      scheduledIndex,
      publisherIndex,
      typeIndex,
      mediaIndex,
      messageIndex,
      clientIndex
    }
  };
};

module.exports = {
  POSTS_URL,
  crawlPosts
};
