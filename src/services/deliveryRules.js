const {
  getPublisherConfig
} = require('../config/publishers');

const normalizeDeliveryType = (value) => {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

const FOLLOW_UP_DELIVERY_TYPES = new Set([
  'whatsapp',
  'status',
  'whatsapp status',
  'whatsapp-status',
  'whatsapp story',
  'whatsapp-story',
  'whatsapp-group',
  'whatsapp group',
  'whatsapp groups',
  'group',
  'groups',
  'instagram-story',
  'instagram story',
  'instagram status',
  'instagram-status'
]);

const isFollowUpRequired = (row) => {
  const config = getPublisherConfig(row?.website);

  return config.requiresFollowUp !== false &&
    FOLLOW_UP_DELIVERY_TYPES.has(normalizeDeliveryType(row?.type));
};

const isScreenshotExempt = (row) => {
  return !isFollowUpRequired(row);
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
  isFollowUpRequired,
  isPublisherDeliveryAllowed,
  isScreenshotExempt,
  normalizeDeliveryType
};
