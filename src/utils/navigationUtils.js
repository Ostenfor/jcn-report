const safeGoto = async (page, url, { maxAttempts = 2, retryDelayMs = 1000 } = {}) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      return;
    } catch (error) {
      if (
        error.message.includes('ERR_ABORTED') ||
        error.message.includes('Navigation failed because page was closed') ||
        error.message.includes('Navigation interrupted')
      ) {
        console.log('La navegación fue abortada por redirect/Nova, continuando...');
        return;
      }

      if (attempt >= maxAttempts) {
        throw error;
      }

      console.log(`Navegación fallida; reintento ${attempt + 1} de ${maxAttempts}...`);
      await page.waitForTimeout(retryDelayMs);
    }
  }
};

module.exports = {
  safeGoto
};
