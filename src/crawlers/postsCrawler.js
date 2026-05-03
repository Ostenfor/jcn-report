const {
  safeGoto
} = require('../utils/navigationUtils');

const crawlPosts = async (page) => {
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

  return {
    rowCount,
    rows
  };
};

module.exports = {
  crawlPosts
};