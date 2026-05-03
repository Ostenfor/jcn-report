const fs = require('fs');

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
  deliveryMatcher = null
}) => {
  const reportCss = buildReportCss();

  const reportScripts = buildReportScripts({
    reportDate,
    deliveryMatcher
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

  const getDeliveryStatusLabel = (status) => {
    const labels = {
      APPROVED: 'Approved',
      COMPLETED_PENDING_APPROVAL: 'Completed - Pending Approval',
      PENDING_SCREENSHOT: 'Pending Screenshot',
      ACTIVE_NO_SCREENSHOT_RECORD: 'Active - Waiting for Screenshot Record',
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

          <a
            class="asset-open-link"
            href="${escapeHtml(url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
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

    return `
      <div class="delivery-actions delivery-no-link">
        No detail URL
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

          <div class="delivery-status ${statusClass}">
            ${escapeHtml(statusLabel)}
          </div>
        </div>

        <div class="delivery-source-row">
          <span>Posts: ${row.existsInPosts ? 'YES' : 'NO'}</span>
          <span>Screenshots: ${row.existsInScreenshots ? 'YES' : 'NO'}</span>
          <span>Screenshots Two: ${row.existsInScreenshotsTwos ? 'YES' : 'NO'}</span>
          <span>Approved: ${row.existsInApproved ? 'YES' : 'NO'}</span>
        </div>

        <div class="delivery-assets">
          ${renderAssetBox('Media', row.media)}
          ${renderAssetBox('Screenshot', row.screenshot)}
          ${renderAssetBox('Screenshot Two', row.screenshotTwo)}
        </div>

        ${renderDeliveryAction(row)}
      </div>
    `;
  };

  const renderDeliverySection = () => {
    if (!deliveryMatcher) {
      return `
        <section class="report-section" id="delivery">
          <div class="section-title-row">
            <h2>4. Screenshot Status</h2>
          </div>
          <div class="empty">No delivery matcher data available.</div>
        </section>
      `;
    }

    const pendingHtml = deliveryMatcher.pending.length
      ? deliveryMatcher.pending.map(renderDeliveryCard).join('')
      : '<div class="empty">No hay publicaciones pendientes.</div>';

    const completedHtml = deliveryMatcher.completed.length
      ? deliveryMatcher.completed.map(renderDeliveryCard).join('')
      : '<div class="empty">No hay publicaciones completadas.</div>';

    return `
      <section class="report-section" id="delivery">
        <div class="section-title-row">
          <h2>4. Screenshot Status</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('delivery')">
            Colapsar / Expandir
          </button>
        </div>

        <div class="section-body" id="section-body-delivery">
          <div class="delivery-summary-grid">
            <div class="summary-card">
              <div class="summary-number">${deliveryMatcher.summary.totalExpected}</div>
              <div class="summary-label">Total esperado del día</div>
            </div>

            <div class="summary-card summary-new">
              <div class="summary-number">${deliveryMatcher.summary.completedTotal}</div>
              <div class="summary-label">Total completados</div>
            </div>

            <div class="summary-card summary-removed">
              <div class="summary-number">${deliveryMatcher.summary.pendingTotal}</div>
              <div class="summary-label">Total pendientes</div>
            </div>

            <div class="summary-card">
              <div class="summary-number">${deliveryMatcher.summary.approved}</div>
              <div class="summary-label">Approved</div>
            </div>

            <div class="summary-card">
              <div class="summary-number">${deliveryMatcher.summary.completedPendingApproval}</div>
              <div class="summary-label">Completed pending approval</div>
            </div>

            <div class="summary-card summary-no-notification">
              <div class="summary-number">${deliveryMatcher.summary.activeNoScreenshotRecord}</div>
              <div class="summary-label">Activos sin screenshot record</div>
            </div>
          </div>

          <h3 class="delivery-heading">Pendientes</h3>
          ${pendingHtml}

          <h3 class="delivery-heading">Completados</h3>
          ${completedHtml}
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
    <button class="tab-button" onclick="showTab('delivery', this)">Screenshot Status (${deliveryMatcher ? deliveryMatcher.summary.pendingTotal : 0} pending)</button>
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

  ${renderDeliverySection()}

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

module.exports = {
  generateIntegratedHtmlReportByPublisher
};