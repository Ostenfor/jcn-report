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
  safeGoto
} = require('./src/utils/navigationUtils');

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
    console.log('');
    console.log('Entrando al login...');

    await safeGoto(page, 'https://dashboard.jewishcontentnetwork.com/admin/login');

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

    await safeGoto(page, postsUrl);

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
})();

