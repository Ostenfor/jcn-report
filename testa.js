// ==================================================
// MODULE 01 - BOOT
// ==================================================
require('dotenv').config();

const fs = require('fs');
const { chromium } = require('playwright');

const {
  normalize,
  allowedPublishersNormalized,
  getWhatsappGroupName,
  getPublisherMention,
  publisherRequiresNotification,
  getNoNotificationPublisherCount,
  getNotificationRequiredPublisherCount
} = require('./src/config/publishers');

const {
  safeGoto
} = require('./src/utils/navigationUtils');

const {
  openHtmlFile,
  getReportDateForFileName,
  getTodayStringRD,
  getReportsFolderPath,
  getUniqueReportFilePath
} = require('./src/utils/fileUtils');

const {
  loadPreviousSnapshot,
  saveSnapshot
} = require('./src/services/snapshotService');

const {
  buildDiff
} = require('./src/services/diffService');

const {
  printRawList,
  printPublisherCountsFromRows,
  printFinalGroupedByPublisher
} = require('./src/utils/consoleUtils');

const {
  parseDate,
  isAtOrAfter5PM,
  formatRowLine
} = require('./src/utils/dateUtils');

const {
  escapeHtml,
  renderNoteLabels
} = require('./src/utils/htmlUtils');
// ==================================================
// END MODULE 01 - BOOT
// ==================================================


// ==================================================
// MODULE 02 - APP START
// ==================================================
(async () => {
  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
  // ==================================================
  // END MODULE 02 - APP START
  // ==================================================


  // ==================================================
  // MODULE 11 - HTML
  // ==================================================
  const generateIntegratedHtmlReportByPublisher = ({
    allRows,
    reminderRows,
    removedRows,
    newRows,
    sameRows,
    generatedAtRD,
    reportDate
  }) => {
    const getPublisherCount = (rows) => {
      return new Set(rows.map(row => row.website)).size;
    };

    const totalPublishersCount = getPublisherCount(allRows);
    const notificationRequiredCount = getNotificationRequiredPublisherCount(allRows);
    const noNotificationRequiredCount = getNoNotificationPublisherCount(allRows);

    const groupRowsByPublisher = (rows) => {
      const notificationRequired = {};
      const noNotificationRequired = {};

      rows.forEach(row => {
        const target = publisherRequiresNotification(row.website)
          ? notificationRequired
          : noNotificationRequired;

        if (!target[row.website]) target[row.website] = [];
        target[row.website].push(row);
      });

      Object.keys(notificationRequired).forEach(publisher => {
        notificationRequired[publisher].sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
      });

      Object.keys(noNotificationRequired).forEach(publisher => {
        noNotificationRequired[publisher].sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
      });

      return {
        notificationRequired,
        noNotificationRequired
      };
    };

    const renderControls = (sectionKey, defaultMessage) => {
      return `
      <div class="message-controls" data-section="${sectionKey}">
        <div class="control-group">
          <label class="control-label" for="message-select-${sectionKey}">Mensaje:</label>
          <select id="message-select-${sectionKey}" onchange="updateSectionMessages('${sectionKey}')">
            <option value="hello" ${defaultMessage === 'hello' ? 'selected' : ''}>hello @ for today we have</option>
            <option value="reminder" ${defaultMessage === 'reminder' ? 'selected' : ''}>last friendly reminder for today @</option>
            <option value="updated" ${defaultMessage === 'updated' ? 'selected' : ''}>List updated @</option>
          </select>
        </div>

        <label class="switch-row">
          <span>Single @</span>
          <input id="mention-switch-${sectionKey}" type="checkbox" onchange="updateSectionMessages('${sectionKey}')">
          <span>Double @ @</span>
        </label>
      </div>
    `;
    };

    const renderPublisherCards = (groupedByPublisher, sectionKey, options = {}) => {
      return Object.keys(groupedByPublisher)
        .sort((a, b) => a.localeCompare(b))
        .map((publisher, index) => {
          const items = groupedByPublisher[publisher];

          const safeIndex = options.noNotificationSection
            ? `no-notification-${index}`
            : index;

          const sentKey = `${sectionKey}|||${publisher}`;
          const confirmKey = `${sectionKey}|||${publisher}`;
          const whatsappGroupName = getWhatsappGroupName(publisher);
          const hasWhatsappGroup = whatsappGroupName && whatsappGroupName !== 'N/A';
          const publisherMention = getPublisherMention(publisher);
          const requiresNotification = !options.noNotificationSection && !options.removedSection;

          const copyLines = items.map(item => formatRowLine(item));

          const visibleLines = items.map(item => {
            const cssClass = item.isNew ? 'line new-line' : 'line';
            const badge = item.isNew ? `<span class="badge-new">NEW</span>` : '';
            const removedBadge = options.removedSection ? `<span class="badge-removed">REMOVIDO</span>` : '';

            return `
              <div class="${cssClass}">
                ${escapeHtml(formatRowLine(item))}
                ${badge}
                ${removedBadge}
              </div>
            `;
          }).join('');

          const messageBlockContent = requiresNotification
            ? `
              <div class="hello dynamic-message" data-section="${sectionKey}"></div>
              <div class="message-spacer"></div>
              ${visibleLines}
            `
            : visibleLines;

          const confirmedCheckbox = requiresNotification ? `
            <label class="header-check confirm-area">
              <input
                id="confirmed-${sectionKey}-${safeIndex}"
                type="checkbox"
                onchange="togglePublisherConfirmedByCard('${sectionKey}', '${safeIndex}', this.checked)"
              >
              <span>Publisher Confirmed</span>
            </label>
          ` : '';

          const sentCheckbox = requiresNotification ? `
            <label class="header-check sent-area">
              <input
                id="sended-${sectionKey}-${safeIndex}"
                type="checkbox"
                onchange="toggleSendedByCard('${sectionKey}', '${safeIndex}', this.checked)"
              >
              <span>Sended</span>
            </label>
          ` : '';

          const actionButtons = requiresNotification ? `
            <div class="action-buttons">
              <button class="whatsapp-btn" onclick="openWhatsAppTest(event, '${sectionKey}', '${safeIndex}')">
                WhatsApp
              </button>

              <button
                class="copy-group-btn ${hasWhatsappGroup ? '' : 'disabled-btn'}"
                onclick="copyWhatsappGroup(event, '${sectionKey}', '${safeIndex}')"
                ${hasWhatsappGroup ? '' : 'disabled'}
              >
                Copy Group
              </button>
            </div>
          ` : '';

          const notesFooter = renderNoteLabels(publisher);

          const groupFooter = !options.removedSection ? `
            <div class="group-footer">
              <span class="group-footer-label">Grupo WhatsApp:</span>
              <span class="group-footer-name">${escapeHtml(whatsappGroupName)}</span>
            </div>
            ${notesFooter}
          ` : '';

          const noNotificationBadge = options.noNotificationSection ? `
            <div class="no-notification-badge">
              No requiere notificación
            </div>
          ` : '';

          return `
          <div
            class="publisher-card ${options.removedSection ? 'removed-card' : ''} ${options.noNotificationSection ? 'no-notification-card' : ''}"
            id="card-${sectionKey}-${safeIndex}"
            data-section-key="${escapeHtml(sectionKey)}"
            data-card-index="${safeIndex}"
            data-sent-key="${escapeHtml(sentKey)}"
            data-confirm-key="${escapeHtml(confirmKey)}"
            data-whatsapp-group="${escapeHtml(whatsappGroupName)}"
            data-mention="${escapeHtml(publisherMention)}"
            data-requires-notification="${requiresNotification ? 'true' : 'false'}"
          >
            <div class="publisher-topbar">
              <div class="publisher-title-wrap">
                <div class="publisher-title" onclick="copyPublisher('${sectionKey}', '${safeIndex}')">
                  <span>${escapeHtml(publisher)}</span>
                  <span class="count">(${items.length})</span>
                  <span class="copied-msg" id="copied-${sectionKey}-${safeIndex}">Copiado ✅</span>
                </div>
              </div>

              <div class="header-checks">
                ${sentCheckbox}
                ${confirmedCheckbox}
              </div>
            </div>

            ${noNotificationBadge}
            ${actionButtons}

            <pre class="copy-lines" id="copy-lines-${sectionKey}-${safeIndex}">${escapeHtml(copyLines.join('\n'))}</pre>

            <div class="message-block" onclick="copyPublisher('${sectionKey}', '${safeIndex}')">
              ${messageBlockContent}
            </div>

            ${groupFooter}
          </div>
          `;
        }).join('');
    };

    const renderNoNotificationBox = (sectionKey, groupedNoNotification) => {
      const publishers = Object.keys(groupedNoNotification);

      if (!publishers.length) return '';

      const totalRows = publishers.reduce((sum, publisher) => {
        return sum + groupedNoNotification[publisher].length;
      }, 0);

      return `
        <div class="no-notification-box">
          <div class="no-notification-header">
            <div>
              <strong>Clientes sin notificación requerida</strong>
              <span>${publishers.length} clientes | ${totalRows} publicaciones</span>
            </div>

            <button class="small-collapse-btn" onclick="toggleNoNotificationBox('${sectionKey}')">
              Ver / Ocultar
            </button>
          </div>

          <div class="no-notification-body collapsed" id="no-notification-body-${sectionKey}">
            ${renderPublisherCards(groupedNoNotification, sectionKey, { noNotificationSection: true })}
          </div>
        </div>
      `;
    };

    const renderSection = (sectionKey, sectionTitle, rows, defaultMessage, options = {}) => {
      const {
        notificationRequired,
        noNotificationRequired
      } = groupRowsByPublisher(rows);

      const sectionPublisherCount = Object.keys(notificationRequired).length;
      const sectionNoNotificationCount = Object.keys(noNotificationRequired).length;

      const cardsHtml = renderPublisherCards(notificationRequired, sectionKey, options);

      const emptyMessage = rows.length === 0
        ? `<div class="empty">No hay registros para esta sección.</div>`
        : '';

      const controls = options.removedSection ? '' : renderControls(sectionKey, defaultMessage);

      const sectionProgressBox = '';

      const summaryText = options.removedSection
        ? `Total: ${rows.length}`
        : `Total: ${rows.length} | Clientes que requieren notificación: ${sectionPublisherCount} | Sin notificación requerida: ${sectionNoNotificationCount} | Pendientes: <span id="pending-confirm-count-${sectionKey}">${sectionPublisherCount}</span>`;

      const pendingConfirmBox = options.removedSection
        ? ''
        : `
          <div class="pending-confirm-box">
            <div class="pending-confirm-header">
              <strong>Clientes pendientes por confirmación</strong>
              <button class="small-collapse-btn" onclick="togglePendingBox('${sectionKey}')">
                Colapsar / Expandir
              </button>
            </div>

            <div class="pending-confirm-body" id="pending-confirm-body-${sectionKey}">
              <div class="pending-confirm-list" id="pending-confirm-list-${sectionKey}"></div>
            </div>
          </div>
        `;

      const noNotificationBox = renderNoNotificationBox(sectionKey, noNotificationRequired);

      return `
      <section class="report-section" id="${sectionKey}">
        <div class="section-title-row">
          <h2>${escapeHtml(sectionTitle)}</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('${sectionKey}')">
            Colapsar / Expandir
          </button>
        </div>

        <div class="section-body" id="section-body-${sectionKey}">
          <div class="section-summary">${summaryText}</div>
          ${controls}
          ${sectionProgressBox}
          ${pendingConfirmBox}
          ${emptyMessage}
          ${cardsHtml}
          ${noNotificationBox}
        </div>
      </section>
      `;
    };

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Reporte Integrado de Publishers</title>

  <style>
    * {
      box-sizing: border-box;
    }

    :root {
      --bg: #0b0f14;
      --bg-soft: #111827;
      --bg-card: #121a24;
      --bg-card-2: #0f172a;
      --text: #f8fafc;
      --muted: #94a3b8;
      --line: #243041;
      --line-soft: #1e293b;
      --accent: #38bdf8;
      --green: #22c55e;
      --yellow: #f59e0b;
      --red: #ef4444;
      --shadow: 0 10px 24px rgba(0,0,0,0.28);
      --radius: 16px;
    }

    html {
      background: var(--bg);
    }

    body {
      font-family: Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(59,130,246,0.08), transparent 28%),
        radial-gradient(circle at top right, rgba(168,85,247,0.06), transparent 24%),
        linear-gradient(180deg, #0b0f14 0%, #0c1118 100%);
      color: var(--text);
      padding: 24px 24px 120px 24px;
      margin: 0;
      font-size: 15px;
      min-height: 100vh;
    }

    h1 {
      margin: 0 0 6px 0;
      font-size: 30px;
      line-height: 1.1;
      font-weight: 800;
    }

    h2 {
      margin: 0;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 800;
      color: #ffffff;
    }

    .generated-time {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #111827, #0f172a);
      color: #fff;
      border-radius: 999px;
      padding: 10px 14px;
      margin: 8px 0 20px 0;
      font-size: 14px;
      border: 1px solid var(--line);
      box-shadow: var(--shadow);
    }

    .generated-time span {
      color: #cbd5e1;
      font-weight: bold;
    }

    .generated-time strong {
      color: #ffffff;
      font-weight: 800;
    }

    .top-summary {
      display: grid;
      grid-template-columns: repeat(6, minmax(130px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .summary-card {
      background: linear-gradient(180deg, rgba(18,26,36,0.96), rgba(15,23,42,0.96));
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 16px;
      box-shadow: var(--shadow);
      min-width: 0;
    }

    .summary-number {
      font-size: 30px;
      font-weight: 800;
      margin-bottom: 6px;
      line-height: 1;
      color: #ffffff;
    }

    .summary-label {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.25;
      font-weight: 600;
    }

    .summary-new .summary-number {
      color: var(--green);
    }

    .summary-removed .summary-number {
      color: var(--red);
    }

    .summary-no-notification .summary-number {
      color: var(--yellow);
    }

    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 16px 0 22px 0;
    }

    .tab-button,
    .collapse-btn,
    .small-collapse-btn,
    .reset-all-btn,
    .whatsapp-btn,
    .copy-group-btn {
      cursor: pointer;
      touch-action: manipulation;
      font-weight: 800;
    }

    .tab-button {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.88);
      color: var(--text);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 14px;
      min-height: 42px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.18);
    }

    .tab-button.active {
      background: linear-gradient(135deg, #0ea5e9, #2563eb);
      color: #fff;
      border-color: #38bdf8;
    }

    .report-section {
      display: none;
    }

    .report-section.active {
      display: block;
    }

    .section-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-top: 34px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--line);
    }

    .collapse-btn,
    .small-collapse-btn {
      border: 1px solid var(--line);
      background: rgba(17,24,39,0.9);
      color: #fff;
      border-radius: 999px;
      padding: 9px 14px;
      white-space: nowrap;
      font-size: 13px;
      min-height: 40px;
    }

    .small-collapse-btn {
      color: #fde68a;
      border-color: rgba(245,158,11,0.45);
      font-size: 12px;
      min-height: 34px;
      padding: 7px 12px;
    }

    .section-body.collapsed,
    .pending-confirm-body.collapsed,
    .no-notification-body.collapsed {
      display: none;
    }

    .section-summary {
      color: var(--muted);
      margin-bottom: 10px;
      font-size: 14px;
      font-weight: 600;
    }

    .message-controls {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(12, 17, 24, 0.96);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      font-size: 13px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .control-label {
      font-weight: 700;
      white-space: nowrap;
      color: var(--text);
    }

    .message-controls select {
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--line);
      font-weight: 700;
      font-size: 13px;
      max-width: 320px;
      min-height: 38px;
      cursor: pointer;
      background: var(--bg-soft);
      color: #fff;
      outline: none;
    }

    .switch-row {
      display: flex;
      gap: 6px;
      align-items: center;
      font-weight: 700;
      font-size: 13px;
      min-height: 34px;
      cursor: pointer;
      color: var(--text);
    }

    .switch-row input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      margin: 0;
      accent-color: #38bdf8;
    }

    .global-reset-row {
      display: flex;
      justify-content: flex-end;
      margin: 8px 0 14px 0;
    }

    .reset-all-btn {
      border: 1px solid rgba(239,68,68,0.45);
      background: linear-gradient(135deg, #b91c1c, #dc2626);
      color: #fff;
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 13px;
      min-height: 40px;
      box-shadow: 0 10px 20px rgba(185,28,28,0.22);
    }

    .section-progress-box {
      display: none;
    }

    .section-progress-row {
      display: none;
    }

    .section-progress-card,
    .publisher-card,
    .pending-confirm-box,
    .no-notification-box {
      background: linear-gradient(180deg, rgba(18,26,36,0.98), rgba(15,23,42,0.98));
      border: 1px solid var(--line);
      border-radius: 16px;
      box-shadow: var(--shadow);
    }

    .pending-confirm-box {
      background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.06));
      border-color: rgba(245,158,11,0.35);
      padding: 12px 14px;
      margin-bottom: 14px;
    }

    .pending-confirm-header,
    .no-notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .pending-confirm-header strong {
      color: #fde68a;
      font-size: 16px;
    }

    .pending-confirm-list {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .pending-pill {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(245,158,11,0.40);
      color: #fde68a;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 13px;
      font-weight: 700;
    }

    .empty {
      background: var(--bg-card);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 18px;
      color: var(--muted);
      margin-bottom: 16px;
      box-shadow: var(--shadow);
    }

    .publisher-card {
      padding: 16px;
      margin-bottom: 18px;
    }

    .publisher-card.sended {
      border-color: rgba(56,189,248,0.45);
      background: linear-gradient(180deg, rgba(11,31,48,0.98), rgba(15,23,42,0.98));
    }

    .publisher-card.confirmed {
      border-color: rgba(34,197,94,0.45);
      background: linear-gradient(180deg, rgba(12,36,24,0.98), rgba(15,23,42,0.98));
    }

    .removed-card {
      border-color: rgba(239,68,68,0.45);
      background: linear-gradient(180deg, rgba(42,18,24,0.98), rgba(20,12,18,0.98));
    }

    .no-notification-card {
      border-color: rgba(245,158,11,0.45);
      background: linear-gradient(180deg, rgba(45,32,12,0.98), rgba(15,23,42,0.98));
    }

    .publisher-topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 14px;
    }

    .publisher-title-wrap {
      flex: 1;
      min-width: 0;
    }

    .publisher-title {
      font-size: 18px;
      font-weight: 800;
      cursor: pointer;
      color: #ffffff;
      user-select: none;
      line-height: 1.25;
    }

    .publisher-title.copied {
      color: #60a5fa;
    }

    .count {
      color: var(--muted);
      font-size: 14px;
      margin-left: 6px;
    }

    .copied-msg {
      display: none;
      color: var(--green);
      font-size: 14px;
      margin-left: 10px;
    }

    .header-checks {
      display: flex;
      flex-wrap: nowrap;
      gap: 18px;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .header-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 800;
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: 34px;
    }

    .header-check input {
      width: 22px;
      height: 22px;
      margin: 0;
      cursor: pointer;
      flex-shrink: 0;
      accent-color: #38bdf8;
    }

    .sent-area {
      color: var(--accent);
    }

    .confirm-area {
      color: var(--green);
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 14px;
    }

    .whatsapp-btn,
    .copy-group-btn {
      border-radius: 999px;
      padding: 10px 16px;
      font-size: 14px;
      min-height: 42px;
      border: 1px solid var(--line);
      box-shadow: 0 8px 18px rgba(0,0,0,0.18);
    }

    .whatsapp-btn {
      border-color: rgba(34,197,94,0.50);
      background: rgba(34,197,94,0.12);
      color: #86efac;
    }

    .copy-group-btn {
      border-color: rgba(96,165,250,0.45);
      background: rgba(59,130,246,0.12);
      color: #93c5fd;
    }

    .disabled-btn {
      opacity: 0.45;
      cursor: not-allowed;
      background: rgba(255,255,255,0.05);
      color: #94a3b8;
      border-color: var(--line);
    }

    .message-block {
      cursor: pointer;
      padding: 14px;
      background: rgba(255,255,255,0.03);
      border-radius: 14px;
      border: 1px solid var(--line-soft);
      line-height: 1.45;
      font-size: 15px;
      overflow-wrap: anywhere;
      color: var(--text);
    }

    .hello {
      font-weight: 800;
      font-size: 16px;
      color: #ffffff;
    }

    .message-spacer {
      height: 10px;
    }

    .line {
      margin-bottom: 6px;
      line-height: 1.45;
      overflow-wrap: anywhere;
      color: #e5e7eb;
    }

    .new-line {
      color: #bbf7d0;
      font-weight: 700;
      background: rgba(34,197,94,0.10);
      border-left: 4px solid var(--green);
      padding: 6px 9px;
      border-radius: 8px;
    }

    .badge-new,
    .badge-removed {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 7px;
      border-radius: 999px;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      vertical-align: middle;
    }

    .badge-new {
      background: var(--green);
      color: #08130c;
    }

    .badge-removed {
      background: var(--red);
    }

    .group-footer,
    .notes-footer {
      margin-top: 12px;
      padding: 11px 12px;
      background: rgba(255,255,255,0.03);
      border: 1px dashed #334155;
      border-radius: 12px;
      line-height: 1.35;
      color: var(--text);
    }

    .group-footer-label {
      color: var(--muted);
      font-weight: 700;
      margin-right: 6px;
    }

    .group-footer-name {
      color: #a7f3d0;
      font-weight: 800;
    }

    .notes-footer {
      background: rgba(59,130,246,0.06);
      border-color: rgba(96,165,250,0.35);
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .notes-footer-label {
      color: #bfdbfe;
      font-weight: 800;
      margin-right: 2px;
    }

    .notes-list {
      display: inline-flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .note-label {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(59,130,246,0.18);
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 800;
      border: 1px solid rgba(96,165,250,0.35);
      white-space: nowrap;
    }

    .no-notification-box {
      margin-top: 22px;
      padding: 14px;
      border-color: rgba(245,158,11,0.35);
      background: linear-gradient(180deg, rgba(245,158,11,0.10), rgba(15,23,42,0.96));
    }

    .no-notification-header strong {
      display: block;
      color: #fde68a;
      font-size: 16px;
      margin-bottom: 3px;
    }

    .no-notification-header span {
      display: block;
      color: #fcd34d;
      font-size: 13px;
      font-weight: 700;
    }

    .no-notification-body {
      margin-top: 14px;
    }

    .no-notification-badge {
      display: inline-flex;
      align-items: center;
      margin-bottom: 12px;
      padding: 5px 10px;
      border-radius: 999px;
      background: rgba(245,158,11,0.16);
      color: #fde68a;
      font-size: 12px;
      font-weight: 900;
      border: 1px solid rgba(245,158,11,0.35);
    }

    .copy-lines {
      display: none;
      white-space: pre-wrap;
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 92px;
      transform: translateX(-50%);
      max-width: calc(100% - 24px);
      background: rgba(15,23,42,0.96);
      color: #fff;
      padding: 12px 14px;
      border-radius: 14px;
      font-size: 14px;
      z-index: 9999;
      box-shadow: var(--shadow);
      border: 1px solid var(--line);
      display: none;
      text-align: center;
    }

    .toast.show {
      display: block;
    }

    .toast strong {
      color: #93c5fd;
    }

    .fixed-progress-footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9998;
      background: rgba(8, 13, 20, 0.96);
      border-top: 1px solid rgba(96,165,250,0.22);
      box-shadow: 0 -10px 28px rgba(0,0,0,0.35);
      backdrop-filter: blur(10px);
      padding: 10px 14px;
    }

    .fixed-progress-inner {
      max-width: 1600px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .fixed-progress-card {
      background: rgba(15,23,42,0.82);
      border: 1px solid rgba(148,163,184,0.22);
      border-radius: 14px;
      padding: 9px 11px;
      min-width: 0;
    }

    .fixed-progress-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 7px;
    }

    .fixed-progress-number {
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1;
    }

    .fixed-progress-label {
      color: #bfdbfe;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .fixed-progress-card.confirmed .fixed-progress-number {
      color: var(--green);
    }

    .fixed-progress-card.sended .fixed-progress-number {
      color: var(--accent);
    }

    .fixed-progress-track {
      height: 7px;
      background: #1e293b;
      border-radius: 999px;
      overflow: hidden;
    }

    .fixed-progress-fill {
      height: 100%;
      width: 0%;
      background: #dc2626;
      border-radius: 999px;
      transition: width 0.25s ease, background 0.25s ease;
    }

    @media (max-width: 900px) {
      body {
        padding: 12px 12px 96px 12px;
        font-size: 14px;
      }

      h1 {
        font-size: 22px;
      }

      h2 {
        font-size: 18px;
      }

      .top-summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .summary-card {
        padding: 12px;
      }

      .summary-number {
        font-size: 22px;
      }

      .summary-label {
        font-size: 11px;
      }

      .fixed-progress-inner {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
      }

      .message-controls {
        padding: 8px 10px;
        gap: 8px;
        font-size: 12px;
      }

      .control-group {
        width: 100%;
        flex: 1 1 100%;
      }

      .message-controls select {
        flex: 1;
        max-width: none;
        min-width: 0;
        font-size: 12px;
      }

      .pending-confirm-box,
      .no-notification-box {
        padding: 10px;
      }

      .publisher-card {
        padding: 14px;
        margin-bottom: 14px;
      }

      .publisher-topbar {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .header-checks {
        justify-content: flex-start;
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 18px;
        width: 100%;
      }

      .header-check {
        font-size: 12px;
      }

      .header-check input {
        width: 20px;
        height: 20px;
      }

      .action-buttons {
        gap: 10px;
      }

      .message-block {
        padding: 10px;
        font-size: 13px;
      }

      .group-footer,
      .notes-footer {
        font-size: 12px;
        padding: 8px 10px;
      }

      .note-label {
        font-size: 10px;
        padding: 3px 8px;
      }

      .line {
        font-size: 13px;
      }

      .toast {
        bottom: 86px;
      }

      .fixed-progress-footer {
        padding: 8px 10px;
      }

      .fixed-progress-card {
        padding: 8px;
        border-radius: 12px;
      }

      .fixed-progress-number {
        font-size: 15px;
      }

      .fixed-progress-label {
        font-size: 10px;
      }

      .fixed-progress-track {
        height: 6px;
      }
    }

    @media (max-width: 430px) {
      .tab-button {
        font-size: 11px;
        padding: 7px 9px;
      }

      .action-buttons {
        flex-direction: column;
      }

      .whatsapp-btn,
      .copy-group-btn {
        width: 100%;
      }

      .message-block {
        font-size: 12.5px;
      }

      .hello {
        font-size: 14px;
      }

      .line {
        font-size: 12.5px;
      }
    }
  </style>
</head>

<body>
  <h1>Reporte Integrado de Publishers</h1>

  <div class="generated-time">
    <span>Generado a las:</span>
    <strong>${escapeHtml(generatedAtRD)}</strong>
  </div>

  <div class="top-summary">
    <div class="summary-card">
      <div class="summary-number">${allRows.length}</div>
      <div class="summary-label">Publicaciones</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${totalPublishersCount}</div>
      <div class="summary-label">Clientes total día</div>
    </div>

    <div class="summary-card">
      <div class="summary-number">${notificationRequiredCount}</div>
      <div class="summary-label">Clientes que requieren notificación</div>
    </div>

    <div class="summary-card summary-no-notification">
      <div class="summary-number">${noNotificationRequiredCount}</div>
      <div class="summary-label">Clientes sin notificación requerida</div>
    </div>

    <div class="summary-card summary-new">
      <div class="summary-number">${newRows.length}</div>
      <div class="summary-label">Agregados nuevos</div>
    </div>

    <div class="summary-card summary-removed">
      <div class="summary-number">${removedRows.length}</div>
      <div class="summary-label">Removidos</div>
    </div>
  </div>

  <div class="global-reset-row">
    <button class="reset-all-btn" onclick="resetAllTodayProgress()">
      Reset todo el día
    </button>
  </div>

  <div class="tabs">
    <button class="tab-button active" onclick="showTab('todos', this)">Reporte completo (${allRows.length})</button>
    <button class="tab-button" onclick="showTab('after5pm', this)">5PM en adelante (${reminderRows.length})</button>
    <button class="tab-button" onclick="showTab('removed', this)">Removidos (${removedRows.length})</button>
  </div>

  ${renderSection(
      'todos',
      '1. Reporte completo del día',
      allRows,
      'hello'
    )}

  ${renderSection(
      'after5pm',
      '2. Last friendly reminder - 5PM en adelante',
      reminderRows,
      'reminder'
    )}

  ${renderSection(
      'removed',
      '3. Removidos en esta versión',
      removedRows,
      '',
      { removedSection: true }
    )}

  <div class="fixed-progress-footer">
    <div class="fixed-progress-inner">
      <div class="fixed-progress-card confirmed">
        <div class="fixed-progress-top">
          <span class="fixed-progress-number">
            <span id="footer-confirmed-count">0</span>/<span id="footer-confirmed-total">0</span>
          </span>
          <span class="fixed-progress-label">Confirmados</span>
        </div>
        <div class="fixed-progress-track">
          <div class="fixed-progress-fill" id="footer-confirmed-fill"></div>
        </div>
      </div>

      <div class="fixed-progress-card sended">
        <div class="fixed-progress-top">
          <span class="fixed-progress-number">
            <span id="footer-sended-count">0</span>/<span id="footer-sended-total">0</span>
          </span>
          <span class="fixed-progress-label">Sended</span>
        </div>
        <div class="fixed-progress-track">
          <div class="fixed-progress-fill" id="footer-sended-fill"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const REPORT_DATE = ${JSON.stringify(reportDate)};
    const STORAGE_VERSION = 'v4';

    const SENDED_PREFIX = 'jcn:' + STORAGE_VERSION + ':sended:' + REPORT_DATE + ':';
    const CONFIRMED_PREFIX = 'jcn:' + STORAGE_VERSION + ':publisher-confirmed:' + REPORT_DATE + ':';

    document.getElementById('todos').classList.add('active');

    function escapeForHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    function getMention(sectionKey) {
      const checked = document.getElementById('mention-switch-' + sectionKey)?.checked;
      return checked ? '@ @' : '@';
    }

    function getMessage(sectionKey, mentionOverride = '') {
      const select = document.getElementById('message-select-' + sectionKey);
      const value = select ? select.value : 'hello';

      const mention = mentionOverride
        ? '@' + mentionOverride
        : getMention(sectionKey);

      if (value === 'hello') return 'hello ' + mention + ' for today we have';
      if (value === 'reminder') return 'last friendly reminder for today ' + mention;
      if (value === 'updated') return 'List updated ' + mention;

      return 'hello ' + mention + ' for today we have';
    }

    function updateSectionMessages(sectionKey) {
      document.querySelectorAll('.dynamic-message[data-section="' + sectionKey + '"]').forEach(el => {
        const card = el.closest('.publisher-card');
        const mentionOverride = card ? card.dataset.mention || '' : '';
        el.innerText = getMessage(sectionKey, mentionOverride);
      });
    }

    function showToast(message) {
      const toast = document.getElementById('toast');
      if (!toast) return;

      toast.innerHTML = message;
      toast.classList.add('show');

      clearTimeout(window.__toastTimer);

      window.__toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 3500);
    }

    function showTab(sectionId, button) {
      document.querySelectorAll('.report-section').forEach(section => {
        section.classList.remove('active');
      });

      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });

      document.getElementById(sectionId).classList.add('active');
      button.classList.add('active');

      if (sectionId !== 'removed') {
        updateSectionMessages(sectionId);
        updateSectionStatus(sectionId);
      } else {
        updateFixedFooterProgress(0, 0, 0, 0);
      }
    }

    function getActiveSectionKey() {
      const active = document.querySelector('.report-section.active');
      return active ? active.id : 'todos';
    }

    function toggleSectionBody(sectionKey) {
      const body = document.getElementById('section-body-' + sectionKey);
      if (!body) return;
      body.classList.toggle('collapsed');
    }

    function togglePendingBox(sectionKey) {
      const body = document.getElementById('pending-confirm-body-' + sectionKey);
      if (!body) return;
      body.classList.toggle('collapsed');
    }

    function toggleNoNotificationBox(sectionKey) {
      const body = document.getElementById('no-notification-body-' + sectionKey);
      if (!body) return;
      body.classList.toggle('collapsed');
    }

    function resetAllTodayProgress() {
      const ok = confirm('¿Seguro que quieres borrar todos los checkmarks de hoy?');

      if (!ok) return;

      Object.keys(localStorage)
        .filter(key =>
          key.startsWith(SENDED_PREFIX) ||
          key.startsWith(CONFIRMED_PREFIX) ||
          key.startsWith('jcn:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v1:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v1:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v2:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v2:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v3:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v3:publisher-confirmed:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v4:sended:' + REPORT_DATE + ':') ||
          key.startsWith('jcn:v4:publisher-confirmed:' + REPORT_DATE + ':')
        )
        .forEach(key => localStorage.removeItem(key));

      document.querySelectorAll('.publisher-card[data-requires-notification="true"]').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('sended-' + sectionKey + '-' + index, false);
        setCheckboxState('confirmed-' + sectionKey + '-' + index, false);

        card.classList.remove('sended');
        card.classList.remove('confirmed');
      });

      updateAllSectionStatuses();
      showToast('Todos los checkmarks de hoy fueron reseteados.');
    }

    function getCard(sectionKey, index) {
      return document.getElementById('card-' + sectionKey + '-' + index);
    }

    function getWhatsappGroupFromCard(sectionKey, index) {
      const card = getCard(sectionKey, index);
      if (!card) return 'N/A';
      return card.dataset.whatsappGroup || 'N/A';
    }

    function openWhatsAppTest(event, sectionKey, index) {
      event.stopPropagation();

      const groupName = getWhatsappGroupFromCard(sectionKey, index);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (groupName && groupName !== 'N/A') {
        showToast('Busca este grupo:<br><strong>' + groupName + '</strong>');
      } else {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
      }

      if (isMobile) {
        window.location.href = 'whatsapp://send';
        return;
      }

      window.open('https://web.whatsapp.com/', '_blank');
    }

    function setCheckboxState(id, checked) {
      const checkbox = document.getElementById(id);
      if (checkbox) checkbox.checked = checked;
    }

    function updateAllSectionStatuses() {
      updateSectionStatus('todos');
      updateSectionStatus('after5pm');
    }

    function applySendedState(sentKey, checked) {
      document.querySelectorAll('[data-sent-key="' + CSS.escape(sentKey) + '"][data-requires-notification="true"]').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('sended-' + sectionKey + '-' + index, checked);

        if (checked) {
          card.classList.add('sended');
        } else {
          card.classList.remove('sended');
        }
      });

      updateAllSectionStatuses();
    }

    function applyConfirmedState(confirmKey, checked) {
      document.querySelectorAll('[data-confirm-key="' + CSS.escape(confirmKey) + '"][data-requires-notification="true"]').forEach(card => {
        const sectionKey = card.dataset.sectionKey;
        const index = card.dataset.cardIndex;

        setCheckboxState('confirmed-' + sectionKey + '-' + index, checked);

        if (checked) {
          card.classList.add('confirmed');
        } else {
          card.classList.remove('confirmed');
        }
      });

      updateAllSectionStatuses();
    }

    function toggleSendedByCard(sectionKey, index, checked) {
      const card = getCard(sectionKey, index);
      if (!card || card.dataset.requiresNotification !== 'true') return;

      const sentKey = card.dataset.sentKey;

      if (checked) {
        localStorage.setItem(SENDED_PREFIX + sentKey, '1');
      } else {
        localStorage.removeItem(SENDED_PREFIX + sentKey);
      }

      applySendedState(sentKey, checked);
    }

    function togglePublisherConfirmedByCard(sectionKey, index, checked) {
      const card = getCard(sectionKey, index);
      if (!card || card.dataset.requiresNotification !== 'true') return;

      const confirmKey = card.dataset.confirmKey;

      if (checked) {
        localStorage.setItem(CONFIRMED_PREFIX + confirmKey, '1');
      } else {
        localStorage.removeItem(CONFIRMED_PREFIX + confirmKey);
      }

      applyConfirmedState(confirmKey, checked);
    }

    function markSendedAfterCopy(sectionKey, index) {
      const card = getCard(sectionKey, index);
      if (!card || card.dataset.requiresNotification !== 'true') return;

      const sentKey = card.dataset.sentKey;

      localStorage.setItem(SENDED_PREFIX + sentKey, '1');
      applySendedState(sentKey, true);
    }

    function getProgressColor(progressPercent) {
      if (progressPercent < 35) return '#ef4444';
      if (progressPercent < 70) return '#f59e0b';
      if (progressPercent < 90) return '#eab308';
      return '#22c55e';
    }

    function getProgressColorSended(progressPercent) {
      if (progressPercent < 35) return '#38bdf8';
      if (progressPercent < 70) return '#3b82f6';
      if (progressPercent < 90) return '#2563eb';
      return '#14b8a6';
    }

    function updateFixedFooterProgress(confirmedClients, totalClients, sendedClients, activeTotal) {
      const confirmedPercent = totalClients === 0
        ? 0
        : Math.round((confirmedClients / totalClients) * 100);

      const sendedPercent = activeTotal === 0
        ? 0
        : Math.round((sendedClients / activeTotal) * 100);

      const footerConfirmedCount = document.getElementById('footer-confirmed-count');
      const footerConfirmedTotal = document.getElementById('footer-confirmed-total');
      const footerConfirmedFill = document.getElementById('footer-confirmed-fill');

      const footerSendedCount = document.getElementById('footer-sended-count');
      const footerSendedTotal = document.getElementById('footer-sended-total');
      const footerSendedFill = document.getElementById('footer-sended-fill');

      if (footerConfirmedCount) footerConfirmedCount.innerText = confirmedClients;
      if (footerConfirmedTotal) footerConfirmedTotal.innerText = totalClients;
      if (footerConfirmedFill) {
        footerConfirmedFill.style.width = confirmedPercent + '%';
        footerConfirmedFill.style.background = getProgressColor(confirmedPercent);
      }

      if (footerSendedCount) footerSendedCount.innerText = sendedClients;
      if (footerSendedTotal) footerSendedTotal.innerText = activeTotal;
      if (footerSendedFill) {
        footerSendedFill.style.width = sendedPercent + '%';
        footerSendedFill.style.background = getProgressColorSended(sendedPercent);
      }
    }

    function updateSectionStatus(sectionKey) {
      const section = document.getElementById(sectionKey);
      if (!section) return;

      const cards = section.querySelectorAll('.publisher-card[data-requires-notification="true"]');
      const totalClients = cards.length;

      let confirmedClients = 0;
      let sendedClients = 0;
      const pendingPublishers = [];

      cards.forEach(card => {
        const confirmKey = card.dataset.confirmKey;
        const sentKey = card.dataset.sentKey;

        const isConfirmed = localStorage.getItem(CONFIRMED_PREFIX + confirmKey) === '1';
        const isSended = localStorage.getItem(SENDED_PREFIX + sentKey) === '1';

        if (isConfirmed) {
          confirmedClients += 1;
        } else {
          const title = card.querySelector('.publisher-title span');
          const publisherName = title ? title.innerText.trim() : 'Unknown publisher';
          pendingPublishers.push(publisherName);
        }

        if (isSended) {
          sendedClients += 1;
        }
      });

      const pendingCounter = document.getElementById('pending-confirm-count-' + sectionKey);
      if (pendingCounter) pendingCounter.innerText = pendingPublishers.length;

      const list = document.getElementById('pending-confirm-list-' + sectionKey);
      if (list) {
        if (pendingPublishers.length === 0) {
          list.innerHTML = '<span class="pending-pill">Todo confirmado ✅</span>';
        } else {
          list.innerHTML = pendingPublishers
            .map(name => '<span class="pending-pill">' + escapeForHtml(name) + '</span>')
            .join('');
        }
      }

      if (getActiveSectionKey() === sectionKey) {
        updateFixedFooterProgress(confirmedClients, totalClients, sendedClients, totalClients);
      }
    }

    function restoreSavedStates() {
      document.querySelectorAll('.publisher-card[data-requires-notification="true"]').forEach(card => {
        const sentKey = card.dataset.sentKey;
        const confirmKey = card.dataset.confirmKey;

        if (sentKey && localStorage.getItem(SENDED_PREFIX + sentKey) === '1') {
          applySendedState(sentKey, true);
        }

        if (confirmKey && localStorage.getItem(CONFIRMED_PREFIX + confirmKey) === '1') {
          applyConfirmedState(confirmKey, true);
        }
      });

      updateAllSectionStatuses();
      updateSectionStatus(getActiveSectionKey());
    }

    function fallbackCopyText(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }

    async function copyTextToClipboard(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopyText(text);
      }
    }

    async function copyWhatsappGroup(event, sectionKey, index) {
      event.stopPropagation();

      const groupName = getWhatsappGroupFromCard(sectionKey, index);

      if (!groupName || groupName === 'N/A') {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
        return;
      }

      try {
        await copyTextToClipboard(groupName);
        showToast('Grupo copiado:<br><strong>' + groupName + '</strong>');
      } catch (error) {
        alert('No se pudo copiar el grupo automáticamente.');
      }
    }

    async function copyPublisher(sectionKey, index) {
      const linesEl = document.getElementById('copy-lines-' + sectionKey + '-' + index);
      const title = document.querySelector('#card-' + sectionKey + '-' + index + ' .publisher-title');
      const copiedMsg = document.getElementById('copied-' + sectionKey + '-' + index);
      const card = getCard(sectionKey, index);

      if (!linesEl || !card) return;

      const lines = linesEl.innerText;
      let text = lines;

      if (sectionKey !== 'removed' && card.dataset.requiresNotification === 'true') {
        const mentionOverride = card.dataset.mention || '';
        text = getMessage(sectionKey, mentionOverride) + '\\n\\n' + lines;
      }

      try {
        await copyTextToClipboard(text);

        if (sectionKey !== 'removed' && card.dataset.requiresNotification === 'true') {
          markSendedAfterCopy(sectionKey, index);
        }

        if (title) title.classList.add('copied');
        if (copiedMsg) copiedMsg.style.display = 'inline';

        setTimeout(() => {
          if (copiedMsg) copiedMsg.style.display = 'none';
        }, 2000);

      } catch (error) {
        alert('No se pudo copiar automáticamente. Puedes copiar manualmente.');
      }
    }

    updateSectionMessages('todos');
    updateSectionMessages('after5pm');
    restoreSavedStates();
    updateAllSectionStatuses();
    updateSectionStatus('todos');
  </script>
</body>
</html>
`;

    const reportsFolder = getReportsFolderPath();

    const filePath = getUniqueReportFilePath(
      reportsFolder,
      'reporte-publishers-integrado',
      reportDate
    );

    fs.writeFileSync(filePath, html, 'utf8');

    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;

    console.log('');
    console.log('==================================================');
    console.log('13. HTML INTEGRADO GENERADO');
    console.log('==================================================');
    console.log(`Archivo creado: ${filePath}`);
    console.log(`Link directo: ${fileUrl}`);

    if (!process.env.CI) {
      openHtmlFile(filePath);
    }
  };
  // ==================================================
  // END MODULE 11 - HTML
  // ==================================================


  // ==================================================
  // MODULE 12 - MAIN
  // ==================================================
  try {
    console.log('');
    console.log('Entrando al login...');

    await safeGoto(page, 'https://dashboard.jewishcontentnetwork.com/admin/login');

    await page.fill('#email', process.env.JCN_USER);
    await page.fill('#password', process.env.JCN_PASS);

    await Promise.all([
      page.waitForTimeout(3000),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(5000);

    console.log('URL después del login:', page.url());

    console.log('Entrando a posts...');

    const postsUrl = 'https://dashboard.jewishcontentnetwork.com/admin/resources/posts';

    await safeGoto(page, postsUrl);

    if (!page.url().includes('/admin/resources/posts')) {
      console.log('Forzando navegación con window.location...');

      await page.evaluate((url) => {
        window.location.href = url;
      }, postsUrl);

      await page.waitForTimeout(7000);
    }

    console.log('URL actual:', page.url());

    console.log('Esperando tabla...');

    await page.waitForSelector('table tbody tr', {
      timeout: 60000
    });

    let rowCount = 0;

    for (let i = 0; i < 10; i++) {
      rowCount = await page.locator('table tbody tr').count();

      if (rowCount > 0) break;

      console.log(`Esperando filas... intento ${i + 1}`);
      await page.waitForTimeout(2000);
    }

    console.log('');
    console.log('==================================================');
    console.log('1. TABLA DETECTADA');
    console.log('==================================================');
    console.log(`Filas detectadas en la tabla: ${rowCount}`);

    const rows = await page.evaluate(() => {
      const data = [];
      const trs = document.querySelectorAll('table tbody tr');

      trs.forEach(row => {
        const cols = row.querySelectorAll('td');

        if (cols.length < 8) return;

        const scheduled = cols[1]?.innerText.replace(/\n/g, ' ').trim() || '';
        const website = cols[2]?.innerText.replace(/\n/g, ' ').trim() || '';
        const type = cols[3]?.innerText.replace(/\n/g, ' ').trim() || '';
        const user = cols[7]?.innerText.replace(/\n/g, ' ').trim() || '';

        if (!scheduled || !website || !type || !user) return;

        data.push({
          scheduled,
          website,
          type,
          user
        });
      });

      return data;
    });

    printRawList('2. RAW SCRAPING', rows, formatRowLine);

    const todayString = getTodayStringRD();

    const rowsToday = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart === todayString;
    });

    const rowsRemovedByDate = rows.filter(r => {
      const datePart = r.scheduled.split(',')[0]?.trim();
      return datePart !== todayString;
    });

    printRawList(`3. FILTRO SOLO HOY (${todayString})`, rowsToday, formatRowLine);
    printRawList(`4. REMOVIDOS POR FECHA (NO SON DE HOY ${todayString})`, rowsRemovedByDate, formatRowLine);

    printPublisherCountsFromRows('5. PUBLICADORES ENCONTRADOS HOY', rowsToday);
    printPublisherCountsFromRows('6. PUBLICADORES REMOVIDOS POR FECHA', rowsRemovedByDate);

    const rowsFiltered = rowsToday.filter(r =>
      allowedPublishersNormalized.has(normalize(r.website))
    );

    const rowsRemovedByWhitelist = rowsToday.filter(r =>
      !allowedPublishersNormalized.has(normalize(r.website))
    );

    printRawList('7. FILTRO POR TU LISTA', rowsFiltered, formatRowLine);
    printRawList('8. REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist, formatRowLine);

    printPublisherCountsFromRows('9. PUBLICADORES FINALES DESPUÉS DEL FILTRO', rowsFiltered);
    printPublisherCountsFromRows('10. PUBLICADORES REMOVIDOS POR TU LISTA', rowsRemovedByWhitelist);

    rowsFiltered.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    const reportsFolder = getReportsFolderPath();
    const reportDate = getReportDateForFileName();

    const previousKeys = await loadPreviousSnapshot(reportsFolder, reportDate);

    const {
      rowsWithStatus,
      newRows,
      removedRows,
      sameRows
    } = buildDiff(rowsFiltered, previousKeys);

    rowsWithStatus.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));
    removedRows.sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

    const rowsFilteredAfter5PM = rowsWithStatus.filter(row => isAtOrAfter5PM(row.scheduled));

    printRawList('11. AGREGADOS NUEVOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', newRows, formatRowLine);
    printRawList('12. REMOVIDOS VS ÚLTIMA VERSIÓN DEL MISMO DÍA', removedRows, formatRowLine);

    console.log('');
    console.log('==================================================');
    console.log('RESUMEN DE CAMBIOS');
    console.log('==================================================');
    console.log(`Total actual: ${rowsWithStatus.length}`);
    console.log(`Agregados nuevos: ${newRows.length}`);
    console.log(`Removidos: ${removedRows.length}`);
    console.log(`Sin cambios: ${sameRows.length}`);

    printFinalGroupedByPublisher({
      title: '13. RESULTADO FINAL AGRUPADO - TODOS',
      rows: rowsWithStatus,
      messageHeader: 'hello @ for today we have',
      parseDate,
      formatRowLine,
      getPublisherMention
    });

    printFinalGroupedByPublisher({
      title: '14. RESULTADO FINAL AGRUPADO - 5PM EN ADELANTE',
      rows: rowsFilteredAfter5PM,
      messageHeader: 'last friendly reminder @',
      parseDate,
      formatRowLine,
      getPublisherMention
    });

    const generatedAtRD = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santo_Domingo',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());

    generateIntegratedHtmlReportByPublisher({
      allRows: rowsWithStatus,
      reminderRows: rowsFilteredAfter5PM,
      removedRows,
      newRows,
      sameRows,
      generatedAtRD,
      reportDate
    });

    saveSnapshot(reportsFolder, reportDate, rowsFiltered);
    // ==================================================
    // END MODULE 12 - MAIN
    // ==================================================


    // ==================================================
    // MODULE 13 - CLEANUP
    // ==================================================
  } catch (error) {
    console.error('');
    console.error('==================================================');
    console.error('ERROR');
    console.error('==================================================');
    console.error(error.message);

    console.log('');
    console.log('URL donde falló:', page.url());

    await page.waitForTimeout(10000);
  } finally {
    await browser.close();
  }
  // ==================================================
  // END MODULE 13 - CLEANUP
  // ==================================================
})();