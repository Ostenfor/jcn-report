// ==================================================
// MODULE 01 - BOOT / IMPORTS
// ==================================================
require('dotenv').config();

const { chromium } = require('playwright');
const {
  normalize,
  allowedPublishersNormalized,
  getPublisherMention
} = require('./src/config/publishers');
const {
  getReportDateForFileName,
  getTodayStringRD,
  getReportsFolderPath
} = require('./src/utils/fileUtils');
const {
  loadPreviousSnapshot,
  saveSnapshot
} = require('./src/services/snapshotService');
const {
  buildDiff
} = require('./src/services/diffService');
const {
  loadDeliveryHistory,
  saveDeliveryHistory,
  loadRecentDeliveryHistoryBundle
} = require('./src/services/deliveryHistoryService');
const {
  printRawList,
  printPublisherCountsFromRows,
  printFinalGroupedByPublisher
} = require('./src/utils/consoleUtils');
const {
  parseDate,
  isAtOrAfter5PM,
  formatRowLine
} = require('./src/utils/dateUtils');
const {
  generateIntegratedHtmlReportByPublisher
} = require('./src/reports/integratedReport');
const {
  login
} = require('./src/auth/login');
const {
  crawlPosts
} = require('./src/crawlers/postsCrawler');
const {
  SCREENSHOTS_URL,
  SCREENSHOTS_TWOS_URL,
  APPROVED_SCREENSHOTS_URL,
  crawlScreenshots
} = require('./src/crawlers/screenshotsCrawler');
const {
  buildDeliveryMatcher,
  printDeliveryMatcherSummary
} = require('./src/services/screenshotMatcherService');
// ==================================================
// END MODULE 01 - BOOT / IMPORTS
// ==================================================

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getRDDate = (offsetDays = 0) => {
  return new Date(Date.now() - offsetDays * ONE_DAY_MS);
};

const getDateStringRDByOffset = (offsetDays = 0) => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }).format(getRDDate(offsetDays));
};

const getReportDateForFileNameByOffset = (offsetDays = 0) => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(getRDDate(offsetDays));
};

const getTomorrowStringRD = () => {
  return getDateStringRDByOffset(-1);
};

const getScheduledDatePart = (row) => {
  return row?.scheduled?.split(',')[0]?.trim() || '';
};

const filterRowsByDate = (rows, dateString) => {
  return rows.filter(row => getScheduledDatePart(row) === dateString);
};

const filterRowsByWhitelist = (rows) => {
  return rows.filter(row => allowedPublishersNormalized.has(normalize(row.website)));
};

const printDeliverySummaryBlock = (title, matcher) => {
  console.log('');
  console.log('==================================================');
  console.log(title);
  console.log('==================================================');
  console.log(`Total esperado del día: ${matcher.summary.totalExpected}`);
  console.log(`Aprobados: ${matcher.summary.approved}`);
  console.log(`Completados pendiente aprobación: ${matcher.summary.completedPendingApproval}`);
  console.log(`Total completados: ${matcher.summary.completedTotal}`);
  console.log(`Total pendientes: ${matcher.summary.pendingTotal}`);
  console.log(`Pendientes screenshot: ${matcher.summary.pendingScreenshot}`);
  console.log(`Activos sin registro screenshot: ${matcher.summary.activeNoScreenshotRecord}`);
  console.log(`Vistos antes pero removidos: ${matcher.summary.previouslySeenRemovedFromDashboard || 0}`);
  console.log(`Unknown: ${matcher.summary.unknown || 0}`);
};

// ==================================================
// MODULE 02 - BROWSER START
// ==================================================
(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);

  // ==================================================
  // END MODULE 02 - BROWSER START
  // ==================================================

  // ==================================================
  // MODULE 03 - MAIN FLOW
  // ==================================================
  try {
    // ------------------------------
    // 3.1 LOGIN
    // ------------------------------
    await login(page);

    // ------------------------------
    // 3.2 DATE CONTEXT
    // ------------------------------
    const todayString = getTodayStringRD();
    const yesterdayString = getDateStringRDByOffset(1);
    const tomorrowString = getTomorrowStringRD();
    const reportsFolder = getReportsFolderPath();
    const reportDate = getReportDateForFileName();
    const yesterdayReportDate = getReportDateForFileNameByOffset(1);

    console.log('');
    console.log('==================================================');
    console.log('DATE CONTEXT');
    console.log('==================================================');
    console.log(`Today RD display: ${todayString}`);
    console.log(`Yesterday RD display: ${yesterdayString}`);
    console.log(`Tomorrow RD display: ${tomorrowString}`);
    console.log(`Today report key: ${reportDate}`);
    console.log(`Yesterday report key: ${yesterdayReportDate}`);

    // ------------------------------
    // 3.3 CRAWL POSTS
    // ------------------------------
    const {
      rows
    } = await crawlPosts(page);

    // ------------------------------
    // 3.4 CRAWL SCREENSHOTS
    // ------------------------------
    const screenshotsResult = await crawlScreenshots({
      page,
      todayString,
      yesterdayString,
      allowedPublishersNormalized,
      normalize,
      url: SCREENSHOTS_URL,
      title: 'screenshots'
    });

    // ------------------------------
    // 3.5 CRAWL SCREENSHOTS TWOS
    // ------------------------------
    const screenshotsTwosResult = await crawlScreenshots({
      page,
      todayString,
      yesterdayString,
      allowedPublishersNormalized,
      normalize,
      url: SCREENSHOTS_TWOS_URL,
      title: 'screenshots-twos'
    });

    // ------------------------------
    // 3.6 CRAWL APPROVED SCREENSHOTS
    // ------------------------------
    const approvedScreenshotsResult = await crawlScreenshots({
      page,
      todayString,
      yesterdayString,
      allowedPublishersNormalized,
      normalize,
      url: APPROVED_SCREENSHOTS_URL,
      title: 'approved-screenshots'
    });

    // ------------------------------
    // 3.7 RAW POSTS OUTPUT
    // ------------------------------
    printRawList('2. RAW SCRAPING', rows, formatRowLine);

    // ------------------------------
    // 3.8 FILTER POSTS BY DATE
    // ------------------------------
    const rowsToday = filterRowsByDate(rows, todayString);
    const rowsYesterday = filterRowsByDate(rows, yesterdayString);
    const rowsTomorrow = filterRowsByDate(rows, tomorrowString);
    const rowsRemovedByDate = rows.filter(row => getScheduledDatePart(row) !== todayString);

    // ------------------------------
    // 3.9 DELIVERY MATCHER WITH HISTORY
    // ------------------------------
    const deliveryHistoryRows = loadDeliveryHistory(reportsFolder, reportDate);
    const yesterdayDeliveryHistoryRows = loadDeliveryHistory(reportsFolder, yesterdayReportDate);

    const deliveryMatcher = buildDeliveryMatcher({
      postsRows: rowsToday,
      screenshotsRows: screenshotsResult.rowsToday,
      screenshotsTwosRows: screenshotsTwosResult.rowsToday,
      approvedRows: approvedScreenshotsResult.rowsToday,
      historyRows: deliveryHistoryRows
    });

    const yesterdayDeliveryMatcher = buildDeliveryMatcher({
      postsRows: rowsYesterday,
      screenshotsRows: screenshotsResult.rowsYesterday,
      screenshotsTwosRows: screenshotsTwosResult.rowsYesterday,
      approvedRows: approvedScreenshotsResult.rowsYesterday,
      historyRows: yesterdayDeliveryHistoryRows
    });

    printDeliveryMatcherSummary(deliveryMatcher);
    printRawList(`3. FILTRO SOLO HOY (${todayString})`, rowsToday, formatRowLine);
    printRawList(`3.1 FILTRO SOLO AYER (${yesterdayString})`, rowsYesterday, formatRowLine);
    printRawList(`3.2 FILTRO SOLO MANANA (${tomorrowString})`, rowsTomorrow, formatRowLine);
    printRawList(`4. REMOVIDOS POR FECHA (NO SON DE HOY ${todayString})`, rowsRemovedByDate, formatRowLine);
    printPublisherCountsFromRows('5. PUBLICADORES ENCONTRADOS HOY', rowsToday);
    printPublisherCountsFromRows('5.1 PUBLICADORES ENCONTRADOS AYER', rowsYesterday);
    printPublisherCountsFromRows('5.2 PUBLICADORES ENCONTRADOS MANANA', rowsTomorrow);
    printPublisherCountsFromRows('6. PUBLICADORES REMOVIDOS POR FECHA', rowsRemovedByDate);

    // ------------------------------
    // 3.10 FILTER POSTS BY PUBLISHER WHITELIST
    // ------------------------------
    const rowsFiltered = filterRowsByWhitelist(rowsToday);
    const rowsFilteredYesterday = filterRowsByWhitelist(rowsYesterday);
    const rowsFilteredTomorrow = filterRowsByWhitelist(rowsTomorrow);
    const rowsRemovedByWhitelist = rowsToday.filter(row =>
      !allowedPublishersNormalized.has(normalize(row.website))
    );

    printRawList('7. FILTRO POR TU LISTA', rowsFiltered, formatRowLine);
    printRawList('7.1 FILTRO POR TU LISTA - AYER', rowsFilteredYesterday, formatRowLine);
    printRawList('7.2 FILTRO POR TU LISTA - MANANA', rowsFilteredTomorrow, formatRowLine);
    printRawList('8. REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist, formatRowLine);
    printPublisherCountsFromRows('9. PUBLICADORES FINALES DESPUÉS DEL FILTRO', rowsFiltered);
    printPublisherCountsFromRows('9.1 PUBLICADORES FINALES DESPUÉS DEL FILTRO - AYER', rowsFilteredYesterday);
    printPublisherCountsFromRows('9.2 PUBLICADORES FINALES DESPUES DEL FILTRO - MANANA', rowsFilteredTomorrow);
    printPublisherCountsFromRows('10. PUBLICADORES REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist);

    rowsFiltered.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
    rowsFilteredYesterday.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
    rowsFilteredTomorrow.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    // ------------------------------
    // 3.11 FULL DELIVERY SUMMARY
    // ------------------------------
    printDeliverySummaryBlock('RESUMEN FOTOS VS CICLO COMPLETO - HOY', deliveryMatcher);
    printDeliverySummaryBlock('RESUMEN FOTOS VS CICLO COMPLETO - AYER', yesterdayDeliveryMatcher);

    // ------------------------------
    // 3.12 SNAPSHOT DIFF
    // ------------------------------
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
    const saturdayRows = rowsFilteredTomorrow.map(row => ({
      ...row,
      isNew: false
    }));

    // ------------------------------
    // 3.13 CONSOLE OUTPUT
    // ------------------------------
    printRawList('11. AGREGADOS NUEVOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', newRows, formatRowLine);
    printRawList('12. REMOVIDOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', removedRows, formatRowLine);

    console.log('');
    console.log('==================================================');
    console.log('RESUMEN DE CAMBIOS');
    console.log('==================================================');
    console.log(`Total actual: ${rowsWithStatus.length}`);
    console.log(`Agregados nuevos: ${newRows.length}`);
    console.log(`Removidos: ${removedRows.length}`);
    console.log(`Sin cambios: ${sameRows.length}`);

    printFinalGroupedByPublisher({
      title: '13. RESULTADO FINAL AGRUPADO - TODOS',
      rows: rowsWithStatus,
      messageHeader: 'hello @ for today we have',
      parseDate,
      formatRowLine,
      getPublisherMention
    });

    printFinalGroupedByPublisher({
      title: '14. RESULTADO FINAL AGRUPADO - 5PM EN ADELANTE',
      rows: rowsFilteredAfter5PM,
      messageHeader: 'last friendly reminder @',
      parseDate,
      formatRowLine,
      getPublisherMention
    });

    printFinalGroupedByPublisher({
      title: '15. RESULTADO FINAL AGRUPADO - SABADO EN ADVANCE',
      rows: saturdayRows,
      messageHeader: 'Hello @ these are the Saturday publications. Sending this friendly reminder in advance.',
      parseDate,
      formatRowLine,
      getPublisherMention
    });

    // ------------------------------
    // 3.14 SAVE DELIVERY HISTORY AND LOAD 3-DAY BUNDLE
    // ------------------------------
    saveDeliveryHistory(reportsFolder, reportDate, deliveryMatcher.deliveries);
    saveDeliveryHistory(reportsFolder, yesterdayReportDate, yesterdayDeliveryMatcher.deliveries);

    const deliveryHistoryBundle = loadRecentDeliveryHistoryBundle(
      reportsFolder,
      reportDate,
      3
    );

    // ------------------------------
    // 3.15 HTML REPORT
    // ------------------------------
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
      saturdayRows,
      removedRows,
      newRows,
      sameRows,
      generatedAtRD,
      reportDate,
      yesterdayReportDate,
      todayString,
      yesterdayString,
      tomorrowString,
      deliveryMatcher,
      yesterdayDeliveryMatcher,
      deliveryHistoryBundle
    });

    // ------------------------------
    // 3.16 SAVE SNAPSHOT
    // ------------------------------
    saveSnapshot(reportsFolder, reportDate, rowsFiltered);

    // ==================================================
    // END MODULE 03 - MAIN FLOW
    // ==================================================

    // ==================================================
    // MODULE 04 - CLEANUP / ERROR HANDLING
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
  // END MODULE 04 - CLEANUP / ERROR HANDLING
  // ==================================================
})();
