const fs = require('fs');
const path = require('path');

const {
  getWhatsappGroupName,
  getPublisherMention,
  publisherRequiresNotification,
  getNoNotificationPublisherCount,
  getNotificationRequiredPublisherCount
} = require('../config/publishers');
const {
  getReportsFolderPath,
  getUniqueReportFilePath,
  openHtmlFile
} = require('../utils/fileUtils');
const {
  parseDate,
  formatRowLine
} = require('../utils/dateUtils');
const {
  escapeHtml,
  renderNoteLabels
} = require('../utils/htmlUtils');
const {
  buildReportCss
} = require('./templates/reportCss');
const {
  buildReportScripts
} = require('./templates/reportScripts');

const generateIntegratedHtmlReportByPublisher = ({
  allRows,
  reminderRows,
  removedRows,
  newRows,
  sameRows,
  generatedAtRD,
  reportDate,
  yesterdayReportDate = '',
  todayString = '',
  yesterdayString = '',
  deliveryMatcher = null,
  yesterdayDeliveryMatcher = null,
  deliveryHistoryBundle = []
}) => {
  const reportCss = buildReportCss();
  const reportScripts = buildReportScripts({
    reportDate,
    deliveryMatcher,
    yesterdayDeliveryMatcher
  });

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
      <div class="controls">
        <label>
          Mensaje:
          <select id="message-select-${sectionKey}" onchange="updateSectionMessages('${sectionKey}')">
            <option value="hello" ${defaultMessage === 'hello' ? 'selected' : ''}>hello @ for today we have</option>
            <option value="reminder" ${defaultMessage === 'reminder' ? 'selected' : ''}>last friendly reminder for today @</option>
            <option value="updated" ${defaultMessage === 'updated' ? 'selected' : ''}>List updated @</option>
          </select>
        </label>

        <label class="mention-switch">
          <input type="checkbox" id="mention-switch-${sectionKey}" onchange="updateSectionMessages('${sectionKey}')">
          <span>Double @</span>
        </label>
      </div>
    `;
  };

  const renderPublisherCards = (groupedByPublisher, sectionKey, options = {}) => {
    return Object.keys(groupedByPublisher)
      .sort((a, b) => a.localeCompare(b))
      .map((publisher, index) => {
        const items = groupedByPublisher[publisher];
        const safeIndex = options.noNotificationSection ? `no-notification-${index}` : index;
        const sentKey = `${sectionKey}|||${publisher}`;
        const confirmKey = `${sectionKey}|||${publisher}`;
        const whatsappGroupName = getWhatsappGroupName(publisher);
        const publisherMention = getPublisherMention(publisher);
        const requiresNotification = !options.noNotificationSection && !options.removedSection;
        const copyLines = items.map(item => formatRowLine(item));

        const visibleLines = items.map(item => {
          const cssClass = item.isNew ? 'line new-line' : 'line';
          const badge = item.isNew ? '<span class="badge-new">NEW</span>' : '';
          const removedBadge = options.removedSection ? '<span class="badge-removed">REMOVIDO</span>' : '';

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
            <div class="dynamic-message" data-section="${sectionKey}"></div>
            <div class="message-lines">${visibleLines}</div>
          `
          : visibleLines;

        const confirmedCheckbox = requiresNotification
          ? `
            <label class="status-check confirmed-check" onclick="event.stopPropagation()">
              <input
                type="checkbox"
                id="confirmed-${sectionKey}-${safeIndex}"
                onchange="togglePublisherConfirmedByCard('${sectionKey}', '${safeIndex}', this.checked)"
              >
              <span>Publisher Confirmed</span>
            </label>
          `
          : '';

        const sentCheckbox = requiresNotification
          ? `
            <label class="status-check sended-check" onclick="event.stopPropagation()">
              <input
                type="checkbox"
                id="sended-${sectionKey}-${safeIndex}"
                onchange="toggleSendedByCard('${sectionKey}', '${safeIndex}', this.checked)"
              >
              <span>Sended</span>
            </label>
          `
          : '';

        const actionButtons = requiresNotification
          ? `
            <div class="card-actions">
              <button onclick="openWhatsAppTest(event, '${sectionKey}', '${safeIndex}')">WhatsApp</button>
              <button onclick="copyWhatsappGroup(event, '${sectionKey}', '${safeIndex}')">Copy Group</button>
            </div>
          `
          : '';

        const notesFooter = renderNoteLabels(publisher);
        const groupFooter = !options.removedSection
          ? `
            <div class="group-footer">
              <span>Grupo WhatsApp: ${escapeHtml(whatsappGroupName)}</span>
              ${notesFooter}
            </div>
          `
          : '';

        const noNotificationBadge = options.noNotificationSection
          ? '<div class="no-notification-badge">No requiere notificación</div>'
          : '';

        return `
          <div
            class="publisher-card"
            id="card-${sectionKey}-${safeIndex}"
            data-section-key="${sectionKey}"
            data-card-index="${safeIndex}"
            data-sent-key="${escapeHtml(sentKey)}"
            data-confirm-key="${escapeHtml(confirmKey)}"
            data-whatsapp-group="${escapeHtml(whatsappGroupName)}"
            data-mention="${escapeHtml(publisherMention || '')}"
            data-requires-notification="${requiresNotification ? 'true' : 'false'}"
          >
            <div class="publisher-card-header">
              <div class="publisher-title" onclick="copyPublisher('${sectionKey}', '${safeIndex}')">
                <span>${escapeHtml(publisher)} (${items.length})</span>
                <small id="copied-${sectionKey}-${safeIndex}" style="display:none;">Copiado ✅</small>
              </div>

              <div class="publisher-status-row">
                ${sentCheckbox}
                ${confirmedCheckbox}
              </div>
            </div>

            ${noNotificationBadge}
            ${actionButtons}

            <pre class="copy-lines" id="copy-lines-${sectionKey}-${safeIndex}">${escapeHtml(copyLines.join('\n'))}</pre>

            <div class="message-block">
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
          <strong>Clientes sin notificación requerida</strong>
          <span>${publishers.length} clientes | ${totalRows} publicaciones</span>
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
    const emptyMessage = rows.length === 0 ? '<div class="empty">No hay registros para esta sección.</div>' : '';
    const controls = options.removedSection ? '' : renderControls(sectionKey, defaultMessage);

    const summaryText = options.removedSection
      ? `Total: ${rows.length}`
      : `Total: ${rows.length} | Clientes que requieren notificación: ${sectionPublisherCount} | Sin notificación requerida: ${sectionNoNotificationCount} | Pendientes: ${sectionPublisherCount}`;

    const pendingConfirmBox = options.removedSection
      ? ''
      : `
        <div class="pending-confirm-box">
          <div class="pending-confirm-header">
            <strong>Clientes pendientes por confirmación</strong>
            <span id="pending-confirm-count-${sectionKey}">${sectionPublisherCount}</span>
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
          <div class="section-summary">${escapeHtml(summaryText)}</div>
          ${controls}
          ${pendingConfirmBox}
          ${emptyMessage}
          ${cardsHtml}
          ${noNotificationBox}
        </div>
      </section>
    `;
  };

  const getDeliveryStatusLabel = (status) => {
    const labels = {
      APPROVED: 'Approved',
      COMPLETED_PENDING_APPROVAL: 'Completed - Pending Approval',
      PENDING_SCREENSHOT: 'Pending Screenshot',
      ACTIVE_NO_SCREENSHOT_RECORD: 'Active - Waiting for Screenshot Record',
      PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD: 'Previously Seen - Removed From Dashboard',
      UNKNOWN: 'Unknown'
    };

    return labels[status] || status || 'Unknown';
  };

  const getDeliveryStatusClass = (status) => {
    const classes = {
      APPROVED: 'status-approved',
      COMPLETED_PENDING_APPROVAL: 'status-completed',
      PENDING_SCREENSHOT: 'status-pending',
      ACTIVE_NO_SCREENSHOT_RECORD: 'status-missing',
      PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD: 'status-missing',
      UNKNOWN: 'status-unknown'
    };

    return classes[status] || 'status-unknown';
  };

  const renderAssetBox = (label, asset) => {
    const url = asset?.thumbnailUrl || asset?.imageUrl || asset?.videoUrl || asset?.linkUrl || '';

    if (!asset?.exists || !url) {
      return `
        <div class="asset-box asset-empty">
          <div class="asset-label">${escapeHtml(label)}</div>
          <div class="asset-missing">No file</div>
        </div>
      `;
    }

    const normalizedUrl = String(url).toLowerCase();
    const isVideo =
      normalizedUrl.includes('.mp4') ||
      normalizedUrl.includes('.mov') ||
      normalizedUrl.includes('.webm') ||
      normalizedUrl.includes('videos.advertserve.com');

    if (isVideo) {
      return `
        <div class="asset-box">
          <div class="asset-label">${escapeHtml(label)}</div>
          <video
            class="asset-video-preview"
            src="${escapeHtml(url)}"
            controls
            muted
            preload="metadata"
            playsinline
          ></video>
          <a class="asset-open-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
            Open video
          </a>
        </div>
      `;
    }

    return `
      <div class="asset-box">
        <div class="asset-label">${escapeHtml(label)}</div>
        <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
          <img class="asset-preview" src="${escapeHtml(url)}" alt="${escapeHtml(label)}">
        </a>
      </div>
    `;
  };

  const renderDeliveryAction = (row) => {
    if (row.detailUrl) {
      return `
        <div class="delivery-actions">
          <a href="${escapeHtml(row.detailUrl)}" target="_blank" rel="noopener noreferrer">
            Open detail
          </a>
        </div>
      `;
    }

    if (row.status === 'ACTIVE_NO_SCREENSHOT_RECORD') {
      return `
        <div class="delivery-actions delivery-no-link">
          No screenshot detail yet. Still active in Posts.
        </div>
      `;
    }

    if (row.status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD') {
      return `
        <div class="delivery-actions delivery-no-link">
          Previously seen, but now missing from current dashboards. Needs manual review if not in approved.
        </div>
      `;
    }

    return '<div class="delivery-actions delivery-no-link">No detail URL</div>';
  };

  const renderDeliveryHistoryInfo = (row) => {
    if (!row.existsInHistory && !row.previousStatus && !row.firstSeenAt && !row.lastSeenAt) {
      return '';
    }

    return `
      <div class="delivery-history-row">
        <span>Previous Status: ${escapeHtml(row.previousStatus || 'N/A')}</span>
        <span>First Seen: ${escapeHtml(row.firstSeenAt || 'N/A')}</span>
        <span>Last Seen: ${escapeHtml(row.lastSeenAt || 'N/A')}</span>
      </div>
    `;
  };

  const renderDeliveryCard = (row) => {
    const statusLabel = getDeliveryStatusLabel(row.status);
    const statusClass = getDeliveryStatusClass(row.status);

    return `
      <div class="delivery-card ${statusClass}">
        <div class="delivery-card-top">
          <div>
            <div class="delivery-title">
              ${escapeHtml(row.website)} <span>(${escapeHtml(row.type)})</span>
            </div>
            <div class="delivery-subtitle">
              ${escapeHtml(row.scheduled)} - ${escapeHtml(row.user)}
            </div>
          </div>
          <div class="delivery-status ${statusClass}">${escapeHtml(statusLabel)}</div>
        </div>

        <div class="delivery-source-row">
          <span>Posts: ${row.existsInPosts ? 'YES' : 'NO'}</span>
          <span>Screenshots: ${row.existsInScreenshots ? 'YES' : 'NO'}</span>
          <span>Screenshots Two: ${row.existsInScreenshotsTwos ? 'YES' : 'NO'}</span>
          <span>Approved: ${row.existsInApproved ? 'YES' : 'NO'}</span>
          <span>History: ${row.existsInHistory ? 'YES' : 'NO'}</span>
        </div>

        ${renderDeliveryHistoryInfo(row)}

        <div class="delivery-assets">
          ${renderAssetBox('Media', row.media)}
          ${renderAssetBox('Screenshot', row.screenshot)}
          ${renderAssetBox('Screenshot Two', row.screenshotTwo)}
        </div>

        ${renderDeliveryAction(row)}
      </div>
    `;
  };

  const renderDeliveryHistorySummaryGrid = (summary = {}) => {
    return `
      <div class="delivery-summary-grid">
        <div class="summary-card">
          <div class="summary-number">${summary.totalExpected || 0}</div>
          <div class="summary-label">Total esperado del día</div>
        </div>

        <div class="summary-card summary-new">
          <div class="summary-number">${summary.completedTotal || 0}</div>
          <div class="summary-label">Total completados</div>
        </div>

        <div class="summary-card summary-removed">
          <div class="summary-number">${summary.pendingTotal || 0}</div>
          <div class="summary-label">Total pendientes</div>
        </div>

        <div class="summary-card">
          <div class="summary-number">${summary.approved || 0}</div>
          <div class="summary-label">Approved</div>
        </div>

        <div class="summary-card">
          <div class="summary-number">${summary.completedPendingApproval || 0}</div>
          <div class="summary-label">Completed pending approval</div>
        </div>

        <div class="summary-card summary-no-notification">
          <div class="summary-number">${summary.activeNoScreenshotRecord || 0}</div>
          <div class="summary-label">Activos sin screenshot record</div>
        </div>

        <div class="summary-card summary-removed">
          <div class="summary-number">${summary.previouslySeenRemovedFromDashboard || 0}</div>
          <div class="summary-label">Vistos antes pero removidos</div>
        </div>
      </div>
    `;
  };

  const renderDeliveryPanel = (historyItem) => {
    const pendingHtml = historyItem.pending.length
      ? historyItem.pending.map(renderDeliveryCard).join('')
      : '<div class="empty">No hay publicaciones pendientes para este día.</div>';

    const completedHtml = historyItem.completed.length
      ? historyItem.completed.map(renderDeliveryCard).join('')
      : '<div class="empty">No hay publicaciones completadas para este día.</div>';

    return `
      <div
        class="delivery-history-panel active-history-panel"
        id="delivery-history-panel-${escapeHtml(historyItem.panelId)}"
        data-history-date="${escapeHtml(historyItem.reportDate)}"
        data-total="${historyItem.summary.totalExpected || 0}"
        data-completed="${historyItem.summary.completedTotal || 0}"
        data-pending="${historyItem.summary.pendingTotal || 0}"
      >
        ${renderDeliveryHistorySummaryGrid(historyItem.summary)}

        <h3 class="delivery-heading">Pendientes</h3>
        ${pendingHtml}

        <h3 class="delivery-heading">Completados</h3>
        ${completedHtml}
      </div>
    `;
  };

  const buildDeliveryItemFromMatcher = ({ matcher, reportDateValue, panelId, label }) => {
    const deliveries = matcher?.deliveries || [];

    return {
      panelId,
      reportDate: reportDateValue || panelId,
      label,
      summary: matcher?.summary || {
        totalExpected: 0,
        approved: 0,
        completedPendingApproval: 0,
        completedTotal: 0,
        pendingScreenshot: 0,
        activeNoScreenshotRecord: 0,
        previouslySeenRemovedFromDashboard: 0,
        unknown: 0,
        pendingTotal: 0
      },
      pending: matcher?.pending || deliveries.filter(row =>
        row.status !== 'APPROVED' && row.status !== 'COMPLETED_PENDING_APPROVAL'
      ),
      completed: matcher?.completed || deliveries.filter(row =>
        row.status === 'APPROVED' || row.status === 'COMPLETED_PENDING_APPROVAL'
      ),
      rows: deliveries
    };
  };

  const renderDeliverySection = ({
    sectionId,
    sectionNumber,
    title,
    matcher,
    reportDateValue,
    displayDate,
    label
  }) => {
    if (!matcher) {
      return `
        <section class="report-section" id="${sectionId}">
          <div class="section-title-row">
            <h2>${sectionNumber}. ${escapeHtml(title)}</h2>
          </div>
          <div class="empty">No delivery matcher data available.</div>
        </section>
      `;
    }

    const historyItem = buildDeliveryItemFromMatcher({
      matcher,
      reportDateValue,
      panelId: sectionId,
      label
    });

    return `
      <section class="report-section" id="${sectionId}">
        <div class="section-title-row">
          <h2>${sectionNumber}. ${escapeHtml(title)}</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('${sectionId}')">
            Colapsar / Expandir
          </button>
        </div>

        <div class="section-body" id="section-body-${sectionId}">
          <div class="delivery-history-controls">
            <strong>${escapeHtml(label)}</strong>
            <span>${escapeHtml(displayDate || reportDateValue || '')}</span>
            <span>Pending: ${historyItem.summary.pendingTotal || 0}</span>
            <span>Completed: ${historyItem.summary.completedTotal || 0}</span>
          </div>

          ${renderDeliveryPanel(historyItem)}
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
    ${reportCss}
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
    <button class="tab-button" onclick="showTab('delivery', this)">Screenshot Status Today (${deliveryMatcher ? deliveryMatcher.summary.pendingTotal : 0} pending)</button>
    <button class="tab-button" onclick="showTab('delivery-yesterday', this)">Screenshot Status Yesterday (${yesterdayDeliveryMatcher ? yesterdayDeliveryMatcher.summary.pendingTotal : 0} pending)</button>
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

  ${renderDeliverySection({
    sectionId: 'delivery',
    sectionNumber: '4',
    title: 'Screenshot Status Today',
    matcher: deliveryMatcher,
    reportDateValue: reportDate,
    displayDate: todayString,
    label: 'Today'
  })}

  ${renderDeliverySection({
    sectionId: 'delivery-yesterday',
    sectionNumber: '5',
    title: 'Screenshot Status Yesterday',
    matcher: yesterdayDeliveryMatcher,
    reportDateValue: yesterdayReportDate,
    displayDate: yesterdayString,
    label: 'Yesterday'
  })}

  <div class="fixed-progress-footer" id="whatsapp-progress-footer">
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

  <div class="fixed-progress-footer hidden-footer" id="delivery-progress-footer">
    <div class="fixed-progress-inner">
      <div class="fixed-progress-card completed">
        <div class="fixed-progress-top">
          <span class="fixed-progress-number">
            <span id="footer-delivery-completed-count">0</span>/<span id="footer-delivery-completed-total">0</span>
          </span>
          <span class="fixed-progress-label">Completed</span>
        </div>
        <div class="fixed-progress-track">
          <div class="fixed-progress-fill" id="footer-delivery-completed-fill"></div>
        </div>
      </div>

      <div class="fixed-progress-card pending">
        <div class="fixed-progress-top">
          <span class="fixed-progress-number">
            <span id="footer-delivery-pending-count">0</span>/<span id="footer-delivery-pending-total">0</span>
          </span>
          <span class="fixed-progress-label">Pending</span>
        </div>
        <div class="fixed-progress-track">
          <div class="fixed-progress-fill" id="footer-delivery-pending-fill"></div>
        </div>
      </div>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    ${reportScripts}
  </script>
</body>
</html>
`;

  const reportsFolder = getReportsFolderPath();

  const shouldOverwriteReport =
    process.env.CI === 'true' ||
    process.env.REPORT_OVERWRITE === 'true';

  const filePath = shouldOverwriteReport
    ? path.join(
      reportsFolder,
      `reporte-publishers-integrado-${reportDate}.html`
    )
    : getUniqueReportFilePath(
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

  if (shouldOverwriteReport) {
    console.log('Modo reporte: OVERWRITE');
  } else {
    console.log('Modo reporte: UNIQUE');
  }

  console.log(`Archivo creado: ${filePath}`);
  console.log(`Link directo: ${fileUrl}`);

  if (!process.env.CI) {
    openHtmlFile(filePath);
  }
};

module.exports = {
  generateIntegratedHtmlReportByPublisher
};
