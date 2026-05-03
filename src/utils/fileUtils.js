const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const openHtmlFile = (filePath) => {
  const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

  console.log('');
  console.log('==================================================');
  console.log('ABRIR REPORTE');
  console.log('==================================================');
  console.log(`Link directo: ${fileUrl}`);

  const command = process.platform === 'win32'
    ? `start "" "${filePath}"`
    : process.platform === 'darwin'
      ? `open "${filePath}"`
      : `xdg-open "${filePath}"`;

  exec(command, (error) => {
    if (error) {
      console.log('');
      console.log('No se pudo abrir automáticamente.');
      console.log(`Abre este link manualmente: ${fileUrl}`);
    }
  });
};

module.exports = {
  openHtmlFile
};