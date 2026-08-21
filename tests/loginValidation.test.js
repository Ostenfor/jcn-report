const assert = require('assert');
const { login } = require('../src/auth/login');

(async () => {
  const previousUser = process.env.JCN_USER;
  const previousPass = process.env.JCN_PASS;

  delete process.env.JCN_USER;
  delete process.env.JCN_PASS;

  try {
    await assert.rejects(
      () => login({}),
      /Faltan JCN_USER o JCN_PASS/
    );
  } finally {
    if (previousUser === undefined) delete process.env.JCN_USER;
    else process.env.JCN_USER = previousUser;

    if (previousPass === undefined) delete process.env.JCN_PASS;
    else process.env.JCN_PASS = previousPass;
  }

  console.log('Login validation test passed.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
