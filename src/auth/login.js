const {
  safeGoto
} = require('../utils/navigationUtils');

const login = async (page) => {
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
};

module.exports = {
  login
};