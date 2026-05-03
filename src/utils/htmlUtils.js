const {
  getPublisherNotes
} = require('../config/publishers');

const escapeHtml = (text) => {
  return String(text || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};

const renderNoteLabels = (publisher) => {
  const notes = getPublisherNotes(publisher);

  if (!notes.length) return '';

  return `
    <div class="notes-footer">
      <span class="notes-footer-label">Notes:</span>
      <span class="notes-list">
        ${notes.map(note => `<span class="note-label">${escapeHtml(note)}</span>`).join('')}
      </span>
    </div>
  `;
};

module.exports = {
  escapeHtml,
  renderNoteLabels
};