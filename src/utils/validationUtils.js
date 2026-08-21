const assertRequiredIndexes = ({ source, headers = [], indexes = {} }) => {
  const missing = Object.entries(indexes)
    .filter(([, index]) => !Number.isInteger(index) || index < 0)
    .map(([name]) => name);

  if (!missing.length) return;

  const detectedHeaders = headers.length ? headers.join(' | ') : 'ninguno';
  throw new Error(
    `${source}: faltan columnas requeridas (${missing.join(', ')}). ` +
    `Encabezados detectados: ${detectedHeaders}`
  );
};

module.exports = {
  assertRequiredIndexes
};
