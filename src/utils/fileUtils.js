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

const getReportDateForFileName = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const getTodayStringRD = () => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  }).format(new Date());
};

const getReportsFolderPath = () => {
  const reportsFolder = path.join(process.cwd(), 'reporte');

  if (!fs.existsSync(reportsFolder)) {
    fs.mkdirSync(reportsFolder, { recursive: true });
  }

  return reportsFolder;
};

const getUniqueReportFilePath = (folderPath, baseName, reportDate) => {
  const baseFileName = `${baseName}-${reportDate}`;
  let filePath = path.join(folderPath, `${baseFileName}.html`);

  if (!fs.existsSync(filePath)) {
    return filePath;
  }

  let counter = 1;

  while (true) {
    filePath = path.join(folderPath, `${baseFileName}.${counter}.html`);

    if (!fs.existsSync(filePath)) {
      return filePath;
    }

    counter++;
  }
};

module.exports = {
  openHtmlFile,
  getReportDateForFileName,
  getTodayStringRD,
  getReportsFolderPath,
  getUniqueReportFilePath
};