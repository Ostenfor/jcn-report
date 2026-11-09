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
    mentions: ['+1 (732) 597-3516'],
    notes: 'No notes'
  },
  {
    publisher: 'Lakewood Scoop',
    group: 'TLS JCN Ads',
    mentions: ['+1 (732) 551-0623'],
    notes: 'No notes'
  },
  {
    publisher: 'Jewish News 24',
    group: 'Jewish News 24 - JCN',
    mentions: ['+1 (347) 450-8383', 'Jewish News 24 Status'],
    notes: 'Dont Send Notification',
    requiresNotification: false
  },
  {
    publisher: 'Meaningful Minute',
    group: 'MM /JCN FAMILY',
    mentions: ['+1 (516) 668-5853', '+1 (516) 668-1152'],
    mentionSearches: ['668-5853', '668-1152'],
    omitMentionInDraft: true,
    notes: 'No notes'
  },
  {
    publisher: 'COL Live',
    group: 'ColLive NEW Group x JCN',
    mentions: ['+1 (917) 705-6098'],
    notes: 'No notes'
  },
  {
    publisher: 'VINnews (Vos Iz Neias)',
    group: 'Chayala ad group - VIN',
    mentions: ['+1 (848) 391-7566'],
    notes: 'No notes'
  },
  {
    publisher: 'Jewish Breaking News',
    group: 'JBN X JCN NEW GROUP',
    mentions: ['+1 (773) 803-0841'],
    notes: 'No notes'
  },
  {
    publisher: 'Yoilish status',
    group: 'Yoilish/JCN',
    mentions: ['+1 (917) 676-3999'],
    notes: 'No notes'
  },
  {
    publisher: 'SY Alerts',
    group: 'JCN SY 2025',
    mentions: ['+1 (917) 696-7602'],
    notes: 'No notes'
  },
  {
    publisher: 'Five Towns Central',
    group: '5T x JCN 2025',
    mentions: ['+1 (516) 509-5503'],
    notes: 'No notes'
  },
  {
    publisher: 'Just My Israel',
    group: 'JustMyIsrael & JCN',
    mentions: ['+1 (848) 525-7778', '+1 (718) 513-9866'],
    notes: 'No notes'
  },
  {
    publisher: "N'shei News",
    mentions: ['+1 (301) 325-1529'],
    aliases: ["N'Shei News", 'N’Shei News', 'N’shei News', "N’shei News"],
    group: 'NEW N’shei x JCN Chat',
    notes: 'No notes'
  },
  {
    publisher: 'Belaaz',
    group: 'Belaaz x JCN Fall 2026',
    mentions: ['+1 (845) 243-7998'],
    notes: 'No notes'
  },
  {
    publisher: 'Arutz Sheva',
    group: 'JCN NEW GROUP A7',
    mentions: ['+972 52-831-9920'],
    notes: 'only Group / no msg on saturday'
  },
  {
    publisher: 'Chez Chaya',
    group: 'Chef Chaya / JCN',
    mentions: ['Chef Chaya Status'],
    mentionSearches: ['Chef'],
    omitMentionInDraft: true,
    notes: 'only Status'
  },
  {
    publisher: 'Kosher.com',
    aliases: ['Kosher. com', 'Kosher com'],
    group: 'NEW JCN x Kosher Group',
    mentions: ['+1 (609) 845-8892', '+1 (516) 522-4536'],
    notes: 'only Group'
  },
  {
    publisher: 'Zemel',
    group: 'JD Media/Zemel/ Kremel',
    mentions: ['+1 (646) 647-6664'],
    notes: 'No notes'
  },
  {
    publisher: 'The Perlowitz Show',
    group: 'NEW Perlowitz Group JCN',
    mentions: ['The Perlowitz Show'],
    notes: 'only Status'
  },
  {
    publisher: 'Mommy Deals',
    group: 'MommyDeals + JCN',
    mentions: ['+1 (305) 803-6560', 'Mommy Deals Status'],
    notes: 'No notes'
  },
  {
    publisher: 'Raizys Cooking',
    mentions: ['+1 (631) 703-7042'],
    aliases: ['Raizy’s Cooking', "Raizy's Cooking"],
    group: 'Raizy’s Cooking / JCN',
    notes: 'only Status'
  },
  {
    publisher: 'Israel Breaking News',
    mentions: ['+1 (443) 990-2072', '+1 (443) 613-1663'],
    group: 'Israel Breaking News🇮🇱 & JCN',
    notes: 'NO STATUS - client does not do Status',
    blockedDeliveryTypes: ['whatsapp', 'status', 'whatsapp status', 'whatsapp-status'],
    blockedDeliveryReminder: 'Israel Breaking News no hace Status. No enviar: fue programado por equivocación.'
  },
  {
    publisher: 'Baltimore Jewish Life',
    group: 'Baltimore Jewish Life / JCN',
    mentions: ['+1 (410) 913-0811'],
    notes: 'Pending Status'
  },
  {
    publisher: 'Israel Live News',
    group: 'Israel Live News x JCN (Yehuda)',
    mentions: ['+972 52-755-9030'],
    notes: 'only Group'
  },
  {
    publisher: 'Meira K.',
    aliases: ['Meira K'],
    group: 'Meira K x JCN 2025',
    notes: 'give time in IST time',
    mentions: ['+972 54-346-8770'],
    addIstTime: true
  },
  {
    publisher: 'Efraim Feder in Lakewood Status',
    group: 'JCN Feder 2025',
    mentions: ['+1 (347) 628-6565'],
    notes: 'Send notification only / no photo follow-up',
    requiresFollowUp: false
  },
  {
    publisher: 'Matzav',
    group: 'N/A',
    notes: 'the client does not want a publisher group',
    requiresNotification: false,
    requiresFollowUp: false,
    noNotificationLabel: 'Sin grupo · No enviar · Revisión manual'
  },
  {
    publisher: 'Addictive Ads',
    group: 'Addictive CWM',
    mentions: ['+1 (732) 503-8255'],
    notes: 'only publisher group to remind them',
    requiresFollowUp: false
  },
  {
    publisher: 'W365',
    group: 'Klal Media - Jewish Content Network JDN',
    mentions: ['+1 (347) 581-1724'],
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
    mentions: ['+1 (347) 581-1724'],
    notes: 'No notes'
  },
  {
    publisher: 'Rockland Daily',
    group: 'Klal Media - Jewish Content Network JDN',
    mentions: ['+1 (347) 581-1724'],
    notes: 'No notes'
  },
  {
    publisher: 'Simcha Spot',
    group: 'SimchaSpot Ads - JCN',
    mentions: ['+1 (848) 391-7566', '+1 (410) 596-1028'],
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
  const mentions = (row.mentions || (row.mention ? [row.mention] : []))
    .map(value => String(value || '').trim())
    .filter(Boolean);

  const cleanConfig = {
    publisher: row.publisher,
    group: row.group || 'N/A',
    notes: splitNotes(row.notes),
    mention: mentions.join(' @'),
    mentions,
    mentionSearches: [...(row.mentionSearches || [])],
    omitMentionInDraft: Boolean(row.omitMentionInDraft),
    addIstTime: Boolean(row.addIstTime),
    requiresNotification: row.requiresNotification !== false,
    requiresFollowUp: row.requiresFollowUp !== false,
    noNotificationLabel: row.noNotificationLabel || '',
    blockedDeliveryTypes: [...(row.blockedDeliveryTypes || [])],
    blockedDeliveryReminder: row.blockedDeliveryReminder || ''
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
    mentions: [],
    mentionSearches: [],
    omitMentionInDraft: false,
    addIstTime: false,
    requiresNotification: true,
    requiresFollowUp: true,
    noNotificationLabel: '',
    blockedDeliveryTypes: [],
    blockedDeliveryReminder: ''
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

const getPublisherMentions = (publisher) => {
  return [...(getPublisherConfig(publisher).mentions || [])];
};

const getPublisherMentionSearches = (publisher) => {
  return [...(getPublisherConfig(publisher).mentionSearches || [])];
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
  getPublisherMentions,
  getPublisherMentionSearches,
  publisherRequiresNotification,
  getNoNotificationPublisherCount,
  getNotificationRequiredPublisherCount
};
