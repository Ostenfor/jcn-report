// ==================================================
// MODULE 01 - BOOT
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
  // MODULE 12 - MAIN
  // ==================================================
  try {
    await login(page);

    const {
      rows
    } = await crawlPosts(page);

    printRawList('2. RAW SCRAPING', rows, formatRowLine);

    const todayString = getTodayStringRD();

    const rowsToday = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart === todayString;
    });

    const rowsRemovedByDate = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart !== todayString;
    });

    printRawList(`3. FILTRO SOLO HOY (${todayString})`, rowsToday, formatRowLine);
    printRawList(`4. REMOVIDOS POR FECHA (NO SON DE HOY ${todayString})`, rowsRemovedByDate, formatRowLine);

    printPublisherCountsFromRows('5. PUBLICADORES ENCONTRADOS HOY', rowsToday);
    printPublisherCountsFromRows('6. PUBLICADORES REMOVIDOS POR FECHA', rowsRemovedByDate);

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
}) ();

