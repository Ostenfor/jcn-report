const safeGoto = async (page, url) => {
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

module.exports = {
  safeGoto
};