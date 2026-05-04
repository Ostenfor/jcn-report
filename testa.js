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

    const reportsFolder = getReportsFolderPath();
    const reportDate = getReportDateForFileName();

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
    const rowsToday = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart === todayString;
    });

    const rowsRemovedByDate = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart !== todayString;
    });

    // ------------------------------
    // 3.9 DELIVERY MATCHER WITH HISTORY
    // ------------------------------
    const deliveryHistoryRows = loadDeliveryHistory(reportsFolder, reportDate);

    const deliveryMatcher = buildDeliveryMatcher({
      postsRows: rowsToday,
      screenshotsRows: screenshotsResult.rowsToday,
      screenshotsTwosRows: screenshotsTwosResult.rowsToday,
      approvedRows: approvedScreenshotsResult.rowsToday,
      historyRows: deliveryHistoryRows
    });

    printDeliveryMatcherSummary(deliveryMatcher);

    printRawList(`3. FILTRO SOLO HOY (${todayString})`, rowsToday, formatRowLine);
    printRawList(`4. REMOVIDOS POR FECHA (NO SON DE HOY ${todayString})`, rowsRemovedByDate, formatRowLine);

    printPublisherCountsFromRows('5. PUBLICADORES ENCONTRADOS HOY', rowsToday);
    printPublisherCountsFromRows('6. PUBLICADORES REMOVIDOS POR FECHA', rowsRemovedByDate);

    // ------------------------------
    // 3.10 FILTER POSTS BY PUBLISHER WHITELIST
    // ------------------------------
    const rowsFiltered = rowsToday.filter(r =>
      allowedPublishersNormalized.has(normalize(r.website))
    );

    const rowsRemovedByWhitelist = rowsToday.filter(r =>
      !allowedPublishersNormalized.has(normalize(r.website))
    );

    printRawList('7. FILTRO POR TU LISTA', rowsFiltered, formatRowLine);
    printRawList('8. REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist, formatRowLine);

    printPublisherCountsFromRows('9. PUBLICADORES FINALES DESPUÉS DEL FILTRO', rowsFiltered);
    printPublisherCountsFromRows('10. PUBLICADORES REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist);

    rowsFiltered.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    // ------------------------------
    // 3.11 FULL DELIVERY SUMMARY
    // ------------------------------
    console.log('');
    console.log('==================================================');
    console.log('RESUMEN FOTOS VS CICLO COMPLETO');
    console.log('==================================================');
    console.log(`Total esperado del día: ${deliveryMatcher.summary.totalExpected}`);
    console.log(`Aprobados: ${deliveryMatcher.summary.approved}`);
    console.log(`Completados pendiente aprobación: ${deliveryMatcher.summary.completedPendingApproval}`);
    console.log(`Total completados: ${deliveryMatcher.summary.completedTotal}`);
    console.log(`Total pendientes: ${deliveryMatcher.summary.pendingTotal}`);
    console.log(`Pendientes screenshot: ${deliveryMatcher.summary.pendingScreenshot}`);
    console.log(`Activos sin registro screenshot: ${deliveryMatcher.summary.activeNoScreenshotRecord}`);
    console.log(`Vistos antes pero removidos: ${deliveryMatcher.summary.previouslySeenRemovedFromDashboard || 0}`);
    console.log(`Unknown: ${deliveryMatcher.summary.unknown || 0}`);

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

    // ------------------------------
    // 3.14 SAVE DELIVERY HISTORY AND LOAD 3-DAY BUNDLE
    // ------------------------------
    saveDeliveryHistory(reportsFolder, reportDate, deliveryMatcher.deliveries);

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
      removedRows,
      newRows,
      sameRows,
      generatedAtRD,
      reportDate,
      deliveryMatcher,
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