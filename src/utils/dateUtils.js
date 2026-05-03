const {
  getPublisherConfig
} = require('../config/publishers');

const parseDate = (text) => {
  const cleaned = String(text || '')
    .replace(/\s+(EST|EDT)$/i, '')
    .trim();

  return new Date(cleaned);
};

const isAtOrAfter5PM = (scheduledText) => {
  const date = parseDate(scheduledText);
  if (isNaN(date.getTime())) return false;
  return date.getHours() >= 17;
};

const addHoursToAmPmTime = (hourRaw, minuteRaw, ampmRaw, hoursToAdd) => {
  let hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const ampm = String(ampmRaw).toUpperCase();

  if (ampm === 'PM' && hour !== 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;

  const date = new Date(2000, 0, 1, hour, minute);
  date.setHours(date.getHours() + hoursToAdd);

  let newHour = date.getHours();
  const newMinute = String(date.getMinutes()).padStart(2, '0');
  const newAmpm = newHour >= 12 ? 'PM' : 'AM';

  newHour = newHour % 12;
  if (newHour === 0) newHour = 12;

  return `${newHour}:${newMinute} ${newAmpm}`;
};

const formatScheduledForPublisher = (scheduledText, publisher) => {
  const config = getPublisherConfig(publisher);

  if (!config.addIstTime) {
    return scheduledText;
  }

  const text = String(scheduledText || '').trim();

  const match = text.match(
    /^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*(EST|EDT)$/i
  );

  if (!match) {
    return scheduledText;
  }

  const [, mm, dd, yyyy, hourRaw, minuteRaw, ampmRaw, tzRaw] = match;

  const originalHour = String(hourRaw).padStart(2, '0');
  const originalMinute = String(minuteRaw).padStart(2, '0');
  const originalAmpm = String(ampmRaw).toUpperCase();
  const originalTz = String(tzRaw).toUpperCase();

  const istTime = addHoursToAmPmTime(
    originalHour,
    originalMinute,
    originalAmpm,
    7
  );

  return `${mm}/${dd}/${yyyy}, ${originalHour}:${originalMinute} ${originalAmpm} ${originalTz} (${istTime} IST)`;
};

const formatRowLine = (item) => {
  const scheduled = formatScheduledForPublisher(item.scheduled, item.website);
  return `${scheduled} - ${item.website} - ${item.type} - ${item.user}`;
};

module.exports = {
  parseDate,
  isAtOrAfter5PM,
  addHoursToAmPmTime,
  formatScheduledForPublisher,
  formatRowLine
};