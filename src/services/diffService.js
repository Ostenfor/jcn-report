const {
  rowKey,
  keyToRow
} = require('./snapshotService');

const buildDiff = (currentRows, previousKeys) => {
  const previousSet = new Set(previousKeys);
  const currentSet = new Set(currentRows.map(rowKey));

  const rowsWithStatus = currentRows.map(row => {
    return {
      ...row,
      isNew: !previousSet.has(rowKey(row))
    };
  });

  const newRows = rowsWithStatus.filter(row => row.isNew);

  const removedRows = previousKeys
    .filter(key => !currentSet.has(key))
    .map(keyToRow)
    .filter(row => row.scheduled && row.website && row.type && row.user);

  const sameRows = rowsWithStatus.filter(row => !row.isNew);

  return {
    rowsWithStatus,
    newRows,
    removedRows,
    sameRows
  };
};

module.exports = {
  buildDiff
};