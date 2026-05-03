const normalize = (text) => (text || '')
  .replace(/[’‘`´]/g, "'")
  .replace(/\s+/g, '')
  .trim()
  .toLowerCase();

const splitNotes = (notes) => {
  const clean = String(notes || '').trim();

  if (!clean) return [];

  if (clean.toLowerCase() === 'no notes') {
    return [];
  }

  return clean
    .split('/')
    .map(note => note.trim())
    .filter(Boolean);
};

const publisherConfigRows = [
  {
    publisher: 'KolHaolam',
    group: 'KOL Haolam JCN',
    notes: 'No notes'
  },
  {
    publisher: 'Lakewood Scoop',
    group: 'TLS JCN Ads',
    notes: 'No notes'
  },
  {
    publisher: 'Jewish News 24',
    group: 'Jewish News 24 - JCN',
    notes: 'Dont Send Notification',
    requiresNotification: false
  },
  {
    publisher: 'Meaningful Minute',
    group: 'MM /JCN FAMILY',
    notes: 'No notes'
  },
  {
    publisher: 'COL Live',
    group: 'COLlive // JCN',
    notes: 'No notes'
  },
  {
    publisher: 'VINnews (Vos Iz Neias)',
    group: 'Chayala ad group - VIN',
    notes: 'No notes'
  },
  {
    publisher: 'Jewish Breaking News',
    group: 'JBN X JCN NEW GROUP',
    notes: 'No notes'
  },
  {
    publisher: 'Yoilish status',
    group: 'Yoilish/JCN',
    notes: 'No notes'
  },
  {
    publisher: 'SY Alerts',
    group: 'JCN SY 2025',
    notes: 'Status broken link'
  },
  {
    publisher: 'Five Towns Central',
    group: '5T x JCN 2025',
    notes: 'No notes'
  },
  {
    publisher: 'Just My Israel',
    group: 'JustMyIsrael & JCN',
    notes: 'No notes'
  },
  {
    publisher: "N'shei News",
    aliases: ["N'Shei News", 'N’Shei News', 'N’shei News', "N’shei News"],
    group: 'Updated N’shei News X JCN',
    notes: 'No notes'
  },
  {
    publisher: 'Belaaz',
    group: 'Belaaz / JCN UPDATED',
    notes: 'No notes'
  },
  {
    publisher: 'Arutz Sheva',
    group: 'JCN NEW GROUP A7',
    notes: 'only Group / no msg on saturday'
  },
  {
    publisher: 'Chez Chaya',
    group: 'Chef Chaya / JCN',
    notes: 'only Status'
  },
  {
    publisher: 'Kosher.com',
    aliases: ['Kosher. com', 'Kosher com'],
    group: 'Kosher.com ad sales',
    notes: 'only Group'
  },
  {
    publisher: 'Zemel',
    group: 'JD media and Zemel',
    notes: 'No notes'
  },
  {
    publisher: 'The Perlowitz Show',
    group: 'NEW Perlowitz Group JCN',
    notes: 'only Status'
  },
  {
    publisher: 'Mommy Deals',
    group: 'MommyDeals + JCN',
    notes: 'No notes'
  },
  {
    publisher: 'Raizys Cooking',
    aliases: ['Raizy’s Cooking', "Raizy's Cooking"],
    group: 'Raizy’s Cooking / JCN',
    notes: 'only Status'
  },
  {
    publisher: 'Israel Breaking News',
    group: 'Israel Breaking News🇮🇱 & JCN',
    notes: 'No notes'
  },
  {
    publisher: 'Baltimore Jewish Life',
    group: 'Baltimore Jewish Life / JCN',
    notes: 'Pending Status'
  },
  {
    publisher: 'Israel Live News',
    group: 'Israel Live News  x JCN (Yehuda)',
    notes: 'only Group'
  },
  {
    publisher: 'Meira K.',
    aliases: ['Meira K'],
    group: 'Meira K x JCN 2025',
    notes: 'give time in IST time',
    mention: '+972 54-346-8770',
    addIstTime: true
  },
  {
    publisher: 'Efraim Feder in Lakewood Status',
    group: 'JCN Feder 2025',
    notes: 'No notes'
  },
  {
    publisher: 'Matzav',
    group: 'N/A',
    notes: 'the client does not want a publisher group',
    requiresNotification: false
  },
  {
    publisher: 'Addictive Ads',
    group: 'Addictive CWM',
    notes: 'only publisher group to remind them'
  },
  {
    publisher: 'W365',
    group: 'Klal Media - Jewish Content Network JDN',
    notes: 'No notes'
  },
  {
    publisher: 'BP24',
    aliases: ['BP 24'],
    group: 'Klal Media - Jewish Content Network JDN',
    notes: 'No notes'
  },
  {
    publisher: 'JDN',
    group: 'Klal Media - Jewish Content Network JDN',
    notes: 'No notes'
  },
  {
    publisher: 'Rockland Daily',
    group: 'Klal Media - Jewish Content Network JDN',
    notes: 'No notes'
  },
  {
    publisher: 'Simcha Spot',
    group: 'SimchaSpot Ads - JCN',
    notes: 'No notes'
  }
];

const allowedPublishers = new Set(
  publisherConfigRows.flatMap(row => [
    row.publisher,
    ...(row.aliases || [])
  ])
);

const allowedPublishersNormalized = new Set(
  [...allowedPublishers].map(normalize)
);

const publisherConfigMap = new Map();

publisherConfigRows.forEach(row => {
  const cleanConfig = {
    publisher: row.publisher,
    group: row.group || 'N/A',
    notes: splitNotes(row.notes),
    mention: row.mention || '',
    addIstTime: Boolean(row.addIstTime),
    requiresNotification: row.requiresNotification !== false
  };

  publisherConfigMap.set(normalize(row.publisher), cleanConfig);

  (row.aliases || []).forEach(alias => {
    publisherConfigMap.set(normalize(alias), cleanConfig);
  });
});

const getPublisherConfig = (publisher) => {
  return publisherConfigMap.get(normalize(publisher)) || {
    publisher,
    group: 'N/A',
    notes: [],
    mention: '',
    addIstTime: false,
    requiresNotification: true
  };
};

const getWhatsappGroupName = (publisher) => {
  return getPublisherConfig(publisher).group || 'N/A';
};

const getPublisherNotes = (publisher) => {
  return getPublisherConfig(publisher).notes || [];
};

const getPublisherMention = (publisher) => {
  return getPublisherConfig(publisher).mention || '';
};

const publisherRequiresNotification = (publisher) => {
  return getPublisherConfig(publisher).requiresNotification !== false;
};

const getNoNotificationPublisherCount = (rows) => {
  return new Set(
    rows
      .filter(row => !publisherRequiresNotification(row.website))
      .map(row => row.website)
  ).size;
};

const getNotificationRequiredPublisherCount = (rows) => {
  return new Set(
    rows
      .filter(row => publisherRequiresNotification(row.website))
      .map(row => row.website)
  ).size;
};

module.exports = {
  normalize,
  splitNotes,
  publisherConfigRows,
  allowedPublishers,
  allowedPublishersNormalized,
  getPublisherConfig,
  getWhatsappGroupName,
  getPublisherNotes,
  getPublisherMention,
  publisherRequiresNotification,
  getNoNotificationPublisherCount,
  getNotificationRequiredPublisherCount
};