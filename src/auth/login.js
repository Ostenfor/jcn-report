const {
  safeGoto
} = require('../utils/navigationUtils');

const login = async (page) => {
  console.log('');
  console.log('Entrando al login...');

  if (!process.env.JCN_USER || !process.env.JCN_PASS) {
    throw new Error('Faltan JCN_USER o JCN_PASS; no se puede iniciar la extraccion.');
  }

  await safeGoto(page, 'https://dashboard.jewishcontentnetwork.com/admin/login');

  await page.fill('#email', process.env.JCN_USER);
  await page.fill('#password', process.env.JCN_PASS);

  await Promise.all([
    page.waitForTimeout(3000),
    page.click('button[type="submit"]')
  ]);

  await page.waitForTimeout(5000);

  if (page.url().includes('/admin/login')) {
    throw new Error('El dashboard mantuvo la sesion en login; verifica las credenciales JCN.');
  }

  console.log('URL después del login:', page.url());
};

module.exports = {
  login
};
