const normalizeHeader = value => String(value || '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const parseDateOnly = value => {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;

  const [, month, day, year] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

const shouldStopAfterPage = ({ headers = [], rows = [], oldestDateString = '' }) => {
  const targetEpoch = parseDateOnly(oldestDateString);
  if (!Number.isFinite(targetEpoch) || !rows.length) return false;

  const scheduledIndex = headers.findIndex(header => {
    const normalized = normalizeHeader(header);
    return normalized === 'scheduled time' ||
      normalized === 'scheduled' ||
      normalized === 'scheduled at' ||
      normalized === 'schedule' ||
      normalized === 'date' ||
      normalized === 'post date';
  });

  if (scheduledIndex < 0) return false;

  const dates = rows
    .map(row => parseDateOnly(row.cellsText?.[scheduledIndex]))
    .filter(Number.isFinite);

  if (!dates.length) return false;

  const sortedNewestFirst = dates.every((date, index) => {
    return index === 0 || date <= dates[index - 1];
  });

  return sortedNewestFirst && dates[dates.length - 1] < targetEpoch;
};

module.exports = {
  parseDateOnly,
  shouldStopAfterPage
};
