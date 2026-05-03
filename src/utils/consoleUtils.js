const printRawList = (title, list, formatRowLine) => {
  console.log('');
  console.log('==================================================');
  console.log(title);
  console.log('==================================================');
  console.log(`Total registros: ${list.length}`);
  console.log('');

  if (list.length === 0) {
    console.log('No hay registros para mostrar.');
    return;
  }

  list.forEach((r, index) => {
    const marker = r.isNew ? ' [NUEVO]' : '';
    console.log(`${index + 1}. ${formatRowLine(r)}${marker}`);
  });
};

const printPublisherCountsFromRows = (title, rows) => {
  const grouped = {};

  rows.forEach(r => {
    if (!grouped[r.website]) grouped[r.website] = 0;
    grouped[r.website]++;
  });

  const publishers = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  console.log('');
  console.log('==================================================');
  console.log(title);
  console.log('==================================================');
  console.log(`Cantidad de publicadores: ${publishers.length}`);
  console.log('');

  if (publishers.length === 0) {
    console.log('No hay publicadores para mostrar.');
    return;
  }

  publishers.forEach((name, index) => {
    console.log(`${index + 1}. ${name} (${grouped[name]})`);
  });
};

const printFinalGroupedByPublisher = ({
  title,
  rows,
  messageHeader,
  parseDate,
  formatRowLine,
  getPublisherMention
}) => {
  const grouped = {};

  rows.forEach(row => {
    if (!grouped[row.website]) {
      grouped[row.website] = [];
    }

    grouped[row.website].push(row);
  });

  console.log('');
  console.log('==================================================');
  console.log(title);
  console.log('==================================================');
  console.log('');

  if (Object.keys(grouped).length === 0) {
    console.log('No hay resultado final para mostrar.');
    return;
  }

  for (const publisher of Object.keys(grouped).sort((a, b) => a.localeCompare(b))) {
    const items = grouped[publisher];

    items.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    console.log(`${publisher} (${items.length})`);

    const mention = getPublisherMention(publisher);
    const finalHeader = mention
      ? messageHeader.replace('@', `@${mention}`)
      : messageHeader;

    console.log(finalHeader);
    console.log('');

    items.forEach(item => {
      const marker = item.isNew ? '  [NUEVO]' : '';
      console.log(`${formatRowLine(item)}${marker}`);
    });

    console.log('');
  }
};

module.exports = {
  printRawList,
  printPublisherCountsFromRows,
  printFinalGroupedByPublisher
};