const normalizeDeliveryType = (value) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const isScreenshotExempt = (row) => {
  return normalizeDeliveryType(row?.type) === 'sponsored article';
};

module.exports = {
  isScreenshotExempt,
  normalizeDeliveryType
};
