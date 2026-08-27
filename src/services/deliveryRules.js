const {
  getPublisherConfig
} = require('../config/publishers');

const normalizeDeliveryType = (value) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const isScreenshotExempt = (row) => {
  return normalizeDeliveryType(row?.type) === 'sponsored article';
};

const isPublisherDeliveryAllowed = (row) => {
  const config = getPublisherConfig(row?.website);
  const deliveryType = normalizeDeliveryType(row?.type);
  const blockedTypes = new Set(
    (config.blockedDeliveryTypes || []).map(normalizeDeliveryType)
  );

  return !blockedTypes.has(deliveryType);
};

const getPublisherDeliveryReminder = (row) => {
  if (isPublisherDeliveryAllowed(row)) return '';
  return getPublisherConfig(row?.website).blockedDeliveryReminder || '';
};

module.exports = {
  getPublisherDeliveryReminder,
  isPublisherDeliveryAllowed,
  isScreenshotExempt,
  normalizeDeliveryType
};
