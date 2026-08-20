const fs = require('fs');
const path = require('path');

const {
  normalize,
  splitNotes,
  publisherConfigRows,
  allowedPublishersNormalized,
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
const {
  buildDeliveryKey
} = require('../services/screenshotMatcherService');

const generateIntegratedHtmlReportByPublisher = ({
  allRows,
  reminderRows,
  saturdayRows = [],
  removedRows,
  newRows,
  sameRows,
  generatedAtRD,
  generatedAtEpochMs = Date.now(),
  reportDate,
  yesterdayReportDate = '',
  todayString = '',
  yesterdayString = '',
  tomorrowString = '',
  deliveryMatcher = null,
  yesterdayDeliveryMatcher = null,
  deliveryHistoryBundle = []
}) => {
  const reportCss = buildReportCss();

  const isAllowedDeliveryPublisher = (row) => {
    return allowedPublishersNormalized.has(normalize(row.website));
  };

  const filterDeliveryMatcherByPublisherList = (matcher) => {
    if (!matcher) return null;

    const allDeliveries = matcher.deliveries || [];
    const deliveries = allDeliveries.filter(isAllowedDeliveryPublisher);

    const completedStatuses = new Set([
      'APPROVED',
      'COMPLETED_PENDING_APPROVAL'
    ]);

    const pending = (matcher.pending || allDeliveries.filter(row => !completedStatuses.has(row.status)))
      .filter(isAllowedDeliveryPublisher);

    const completed = (matcher.completed || allDeliveries.filter(row => completedStatuses.has(row.status)))
      .filter(isAllowedDeliveryPublisher);

    const countByStatus = (status) => {
      return deliveries.filter(row => row.status === status).length;
    };

    return {
      ...matcher,
      deliveries,
      pending,
      completed,
      summary: {
        ...(matcher.summary || {}),
        totalExpected: deliveries.length,
        approved: countByStatus('APPROVED'),
        completedPendingApproval: countByStatus('COMPLETED_PENDING_APPROVAL'),
        pendingScreenshot: countByStatus('PENDING_SCREENSHOT'),
        activeNoScreenshotRecord: countByStatus('ACTIVE_NO_SCREENSHOT_RECORD'),
        previouslySeenRemovedFromDashboard: countByStatus('PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD'),
        unknown: countByStatus('UNKNOWN'),
        completedTotal: completed.length,
        pendingTotal: pending.length
      }
    };
  };

  const filteredDeliveryMatcher = filterDeliveryMatcherByPublisherList(deliveryMatcher);
  const filteredYesterdayDeliveryMatcher = filterDeliveryMatcherByPublisherList(yesterdayDeliveryMatcher);

  const automaticClosedStatuses = new Set(['APPROVED']);
  const todayDeliveries = filteredDeliveryMatcher?.deliveries || [];
  const yesterdayDeliveries = filteredYesterdayDeliveryMatcher?.deliveries || [];
  const overnightDeliveries = yesterdayDeliveries.filter(row =>
    !automaticClosedStatuses.has(row.status)
  );
  const masterDeliveries = [
    ...overnightDeliveries.map(row => ({ ...row, workScope: 'overnight' })),
    ...todayDeliveries.map(row => ({ ...row, workScope: 'today' }))
  ].sort((a, b) => parseDate(a.scheduled) - parseDate(b.scheduled));

  const deliveryByKey = new Map(
    [...todayDeliveries, ...yesterdayDeliveries].map(row => [row.key, row])
  );

  const getQueueExitReason = delivery => {
    let exitReason = 'DISAPPEARED_REVIEW';

    if (delivery?.status === 'APPROVED') {
      exitReason = 'COMPLETED_APPROVED';
    } else if (delivery?.status === 'COMPLETED_PENDING_APPROVAL') {
      exitReason = 'SCREENSHOT_UPLOADED';
    } else if (delivery?.status === 'PENDING_SCREENSHOT') {
      exitReason = 'LEFT_POSTS_SCREENSHOT_PENDING';
    } else if (delivery?.status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD') {
      exitReason = 'DISAPPEARED_REVIEW';
    }

    return exitReason;
  };

  const queueExitMap = new Map();

  removedRows.forEach(row => {
    const key = buildDeliveryKey(row);
    const delivery = deliveryByKey.get(key);
    queueExitMap.set(key, {
      ...row,
      key,
      delivery,
      exitReason: getQueueExitReason(delivery)
    });
  });

  todayDeliveries
    .filter(row => !row.existsInPosts && (
      row.existsInApproved ||
      row.existsInScreenshots ||
      row.existsInScreenshotsTwos ||
      row.existsInHistory
    ))
    .forEach(delivery => {
      queueExitMap.set(delivery.key, {
        ...delivery,
        delivery,
        exitReason: getQueueExitReason(delivery)
      });
    });

  const queueExitRows = Array.from(queueExitMap.values()).sort((a, b) => {
    return parseDate(a.scheduled) - parseDate(b.scheduled);
  });

  const reportScripts = buildReportScripts({
    reportDate,
    generatedAtEpochMs,
    deliveryMatcher: filteredDeliveryMatcher,
    yesterdayDeliveryMatcher: filteredYesterdayDeliveryMatcher
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
            <option value="saturday" ${defaultMessage === 'saturday' ? 'selected' : ''}>Hello @ these are the Saturday publications. Sending this friendly reminder in advance.</option>
            <option value="updated" ${defaultMessage === 'updated' ? 'selected' : ''}>List updated @</option>
          </select>
        </label>

        <label class="mention-switch">
          <input
            type="checkbox"
            id="mention-switch-${sectionKey}"
            onclick="event.stopPropagation()"
            onchange="updateSectionMessages('${sectionKey}')"
          >
          <span>Double @</span>
        </label>
      </div>
    `;
  };

  const getAutomaticStatusLabel = (status) => {
    const labels = {
      APPROVED: 'Completado y aprobado',
      COMPLETED_PENDING_APPROVAL: 'Captura subida - falta aprobar',
      PENDING_SCREENSHOT: 'Captura pendiente',
      ACTIVE_NO_SCREENSHOT_RECORD: 'Activo - sin registro de captura',
      PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD: 'Desapareció - revisar',
      UNKNOWN: 'Requiere revisión'
    };

    return labels[status] || status || 'Sin detectar';
  };

  const renderStatusJourney = ({ compact = false } = {}) => `
    <div class="status-journey ${compact ? 'status-journey-compact' : ''}" aria-label="Progreso del anuncio">
      <div class="journey-main-track">
        <button type="button" class="journey-step" data-stage="SCHEDULED" onclick="setDeliveryStage(event, this)">
          <span class="journey-dot">✓</span><span>Programado</span>
        </button>
        <button type="button" class="journey-step" data-stage="PENDING_CAPTURE" onclick="setDeliveryStage(event, this)">
          <span class="journey-dot">✓</span><span>Esperando captura</span>
        </button>
        <button type="button" class="journey-step" data-stage="SCREENSHOT_UPLOADED" onclick="setDeliveryStage(event, this)">
          <span class="journey-dot">✓</span><span>Captura subida</span>
        </button>
        <button type="button" class="journey-step" data-stage="COMPLETED" onclick="setDeliveryStage(event, this)">
          <span class="journey-dot">✓</span><span>Completado</span>
        </button>
      </div>
      <div class="journey-exceptions">
        <button type="button" class="journey-exception" data-stage="MOVED" onclick="setDeliveryStage(event, this)">
          <span>✓</span> Se movió
        </button>
        <button type="button" class="journey-exception" data-stage="REMOVED" onclick="setDeliveryStage(event, this)">
          <span>✓</span> Eliminado
        </button>
        <button type="button" class="journey-exception" data-stage="REVIEW" onclick="setDeliveryStage(event, this)">
          <span>!</span> Revisar
        </button>
        <button type="button" class="journey-exception delivery-flag-button" data-delivery-flag="noResponse" onclick="toggleDeliveryFlag(event, this)">
          <span>✓</span> No respondió
        </button>
      </div>
      <div class="tracking-origin">Detectado por el sistema</div>
    </div>
  `;

  const renderManualStatusOptions = () => `
    <option value="">Automático</option>
    <option value="MANUAL_COMPLETED">Completado manualmente</option>
    <option value="PENDING_SCREENSHOT">Captura pendiente</option>
    <option value="NO_RESPONSE">Cliente no respondió</option>
    <option value="NEEDS_REVIEW">Requiere revisión</option>
    <option value="RESCHEDULED">Reprogramado</option>
    <option value="REMOVED_CANCELLED">Eliminado / cancelado</option>
  `;

  const renderCompactTracking = (row) => {
    const key = buildDeliveryKey(row);
    const delivery = deliveryByKey.get(key);
    const automaticStatus = delivery?.status || 'ACTIVE_NO_SCREENSHOT_RECORD';

    return `
      <div
        class="compact-tracking delivery-trackable"
        data-delivery-key="${escapeHtml(key)}"
        data-auto-status="${escapeHtml(automaticStatus)}"
        data-scheduled="${escapeHtml(row.scheduled)}"
      >
        <span class="tracking-inline-status">${escapeHtml(getAutomaticStatusLabel(automaticStatus))}</span>
        <span class="tracking-inline-timer">Calculando...</span>
        <select
          class="delivery-status-select compact-status-select"
          aria-label="Cambiar estado del anuncio"
          onchange="setDeliveryManualStatus(this)"
        >
          ${renderManualStatusOptions()}
        </select>
        <button type="button" class="tracking-manage-btn" onclick="openMasterForDelivery(event, this)">
          Gestionar
        </button>
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
        const hasWhatsappGroup = Boolean(whatsappGroupName && String(whatsappGroupName).trim());
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
                onclick="event.stopPropagation()"
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
                onclick="event.stopPropagation()"
                onchange="toggleSendedByCard('${sectionKey}', '${safeIndex}', this.checked)"
              >
              <span>Sended</span>
            </label>
          `
          : '';

        const actionButtons = requiresNotification
          ? `
            <div class="card-actions" onclick="event.stopPropagation()">
              <button
                type="button"
                class="action-btn whatsapp-btn"
                onclick="openWhatsAppTest(event, '${sectionKey}', '${safeIndex}')"
              >
                WhatsApp
              </button>

              <button
                type="button"
                class="action-btn copy-message-btn"
                onclick="event.stopPropagation(); copyPublisher('${sectionKey}', '${safeIndex}')"
              >
                Copy Message
              </button>

              <button
                type="button"
                class="action-btn copy-group-btn ${hasWhatsappGroup ? '' : 'disabled-btn'}"
                onclick="copyWhatsappGroup(event, '${sectionKey}', '${safeIndex}')"
                ${hasWhatsappGroup ? '' : 'disabled'}
              >
                Copy Group
              </button>
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

  const renderImportantClientsSection = () => {
    const clients = publisherConfigRows
      .slice()
      .sort((a, b) => a.publisher.localeCompare(b.publisher));

    const clientCards = clients.map(row => {
      const notes = splitNotes(row.notes);
      const aliases = row.aliases || [];
      const searchText = [
        row.publisher,
        row.group,
        row.notes,
        aliases.join(' '),
        row.requiresNotification === false ? 'no notification' : 'notification'
      ].filter(Boolean).join(' ');

      const noteLabels = notes.length
        ? notes.map(note => `<span class="note-label">${escapeHtml(note)}</span>`).join('')
        : '<span class="note-label muted-note">No notes</span>';

      const aliasesHtml = aliases.length
        ? `<div class="client-aliases">Aliases: ${aliases.map(alias => escapeHtml(alias)).join(', ')}</div>`
        : '';

      const notificationLabel = row.requiresNotification === false
        ? '<span class="client-status no-notify">No notification</span>'
        : '<span class="client-status notify">Notification required</span>';

      return `
        <div class="important-client-card" data-client-search="${escapeHtml(searchText.toLowerCase())}">
          <div class="important-client-top">
            <div>
              <h3>${escapeHtml(row.publisher)}</h3>
              ${aliasesHtml}
            </div>
            ${notificationLabel}
          </div>

          <div class="client-group-row">
            <strong>WhatsApp:</strong>
            <span>${escapeHtml(row.group || 'N/A')}</span>
          </div>

          <div class="client-notes-row">
            <strong>Notes:</strong>
            <div class="notes-list">${noteLabels}</div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="report-section" id="important-clients">
        <div class="section-title-row">
          <h2>7. Clientes importantes para filtro</h2>
          <button class="collapse-btn" onclick="toggleSectionBody('important-clients')">
            Colapsar / Expandir
          </button>
        </div>
        <div class="section-body" id="section-body-important-clients">
          <div class="section-summary">${clients.length} clientes configurados para busqueda manual.</div>
          <div class="client-search-bar">
            <input
              type="search"
              id="important-client-search"
              placeholder="Buscar cliente, grupo, alias o nota..."
              oninput="filterImportantClients(this.value)"
            >
            <span id="important-client-count">${clients.length} de ${clients.length}</span>
          </div>
          <div class="important-client-grid" id="important-client-grid" data-total="${clients.length}">
            ${clientCards}
          </div>
        </div>
      </section>
    `;
  };

  const getDeliveryStatusLabel = (status) => {
    const labels = {
      APPROVED: 'Completado y aprobado',
      COMPLETED_PENDING_APPROVAL: 'Captura subida - falta aprobar',
      PENDING_SCREENSHOT: 'Captura pendiente',
      ACTIVE_NO_SCREENSHOT_RECORD: 'Activo - esperando registro de captura',
      PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD: 'Desapareció del dashboard - revisar',
      UNKNOWN: 'Requiere revisión'
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

  const renderMasterDeliveryCard = (row) => {
    const statusLabel = getDeliveryStatusLabel(row.status);
    const statusClass = getDeliveryStatusClass(row.status);
    const workScope = row.workScope || '';
    const exitLabels = {
      COMPLETED_APPROVED: 'Salió de la cola: completado y aprobado',
      SCREENSHOT_UPLOADED: 'Salió de la cola: captura subida, falta confirmar aprobación',
      LEFT_POSTS_SCREENSHOT_PENDING: 'Salió de Past Due, pero la captura sigue pendiente',
      DISAPPEARED_REVIEW: 'Salió de la cola sin explicación: requiere revisión'
    };
    const exitBanner = row.exitReason
      ? `<div class="queue-exit-reason exit-${escapeHtml(row.exitReason.toLowerCase())}">${escapeHtml(exitLabels[row.exitReason] || row.exitReason)}</div>`
      : '';

    return `
      <div
        class="delivery-card delivery-trackable ${statusClass}"
        data-delivery-publisher="${escapeHtml(row.website)}"
        data-delivery-key="${escapeHtml(row.key || buildDeliveryKey(row))}"
        data-auto-status="${escapeHtml(row.status || 'UNKNOWN')}"
        data-scheduled="${escapeHtml(row.scheduled)}"
        data-work-scope="${escapeHtml(workScope)}"
      >
        <div class="delivery-card-top">
          <div>
            <div class="delivery-title">
              ${escapeHtml(row.website)} <span>(${escapeHtml(row.type)})</span>
            </div>
            <div class="delivery-subtitle">
              ${escapeHtml(row.scheduled)} - ${escapeHtml(row.user)}
            </div>
          </div>
          <div>
            <div class="delivery-status ${statusClass}">${escapeHtml(statusLabel)}</div>
            <div class="delivery-delay-clock">Calculando seguimiento...</div>
          </div>
        </div>

        ${renderStatusJourney()}

        ${exitBanner}

        <div class="delivery-assets master-delivery-assets">
          ${renderAssetBox('Media', row.media)}
          ${renderAssetBox('Screenshot', row.screenshot)}
          ${renderAssetBox('Screenshot Two', row.screenshotTwo)}
        </div>

        <details class="delivery-evidence delivery-origin-details">
          <summary>Ver origen de datos</summary>
          <div class="delivery-source-row">
            <span>Past Due: ${row.existsInPosts ? 'SÍ' : 'NO'}</span>
            <span>Screenshots: ${row.existsInScreenshots ? 'SÍ' : 'NO'}</span>
            <span>Glenn Screenshots: ${row.existsInScreenshotsTwos ? 'SÍ' : 'NO'}</span>
            <span>Approved: ${row.existsInApproved ? 'SÍ' : 'NO'}</span>
          </div>
          ${renderDeliveryHistoryInfo(row)}
          ${renderDeliveryAction(row)}
        </details>
      </div>
    `;
  };

  const renderDeliveryCard = (row) => {
    const statusLabel = getDeliveryStatusLabel(row.status);
    const statusClass = getDeliveryStatusClass(row.status);
    const workScope = row.workScope || '';
    const exitLabels = {
      COMPLETED_APPROVED: 'Salió de la cola: completado y aprobado',
      SCREENSHOT_UPLOADED: 'Salió de la cola: captura subida, falta confirmar aprobación',
      LEFT_POSTS_SCREENSHOT_PENDING: 'Salió de Past Due, pero la captura sigue pendiente',
      DISAPPEARED_REVIEW: 'Salió de la cola sin explicación: requiere revisión'
    };
    const exitBanner = row.exitReason
      ? `<div class="queue-exit-reason exit-${escapeHtml(row.exitReason.toLowerCase())}">${escapeHtml(exitLabels[row.exitReason] || row.exitReason)}</div>`
      : '';

    return `
      <div
        class="delivery-card delivery-trackable ${statusClass}"
        data-delivery-publisher="${escapeHtml(row.website)}"
        data-delivery-key="${escapeHtml(row.key || buildDeliveryKey(row))}"
        data-auto-status="${escapeHtml(row.status || 'UNKNOWN')}"
        data-scheduled="${escapeHtml(row.scheduled)}"
        data-work-scope="${escapeHtml(workScope)}"
      >
        <div class="delivery-card-top">
          <div>
            <div class="delivery-title">
              ${escapeHtml(row.website)} <span>(${escapeHtml(row.type)})</span>
            </div>
            <div class="delivery-subtitle">
              ${escapeHtml(row.scheduled)} - ${escapeHtml(row.user)}
            </div>
          </div>
          <div>
            <div class="delivery-status ${statusClass}">${escapeHtml(statusLabel)}</div>
            <div class="delivery-delay-clock">Calculando seguimiento...</div>
          </div>
        </div>

        <div class="delivery-source-row">
          <span>Posts: ${row.existsInPosts ? 'YES' : 'NO'}</span>
          <span>Screenshots: ${row.existsInScreenshots ? 'YES' : 'NO'}</span>
          <span>Screenshots Two: ${row.existsInScreenshotsTwos ? 'YES' : 'NO'}</span>
          <span>Approved: ${row.existsInApproved ? 'YES' : 'NO'}</span>
          <span>History: ${row.existsInHistory ? 'YES' : 'NO'}</span>
        </div>

        ${renderDeliveryHistoryInfo(row)}

        <div class="delivery-manual-control">
          <div class="manual-control-heading">
            <strong>Control manual</strong>
            <span class="manual-override-badge">Usando estado automático</span>
          </div>
          <div class="manual-control-grid">
            <label>
              Estado operativo
              <select class="delivery-status-select" onchange="setDeliveryManualStatus(this)">
                ${renderManualStatusOptions()}
              </select>
            </label>
            <label class="reschedule-field">
              Nueva fecha y hora
              <input class="delivery-reschedule-input" type="datetime-local" onchange="saveDeliveryControl(this)">
            </label>
            <label class="delivery-note-field">
              Nota
              <input class="delivery-note-input" type="text" maxlength="240" placeholder="Ej. cliente no respondió" onchange="saveDeliveryControl(this)">
            </label>
            <button type="button" class="return-auto-btn" onclick="returnDeliveryToAutomatic(this)">
              Volver a automático
            </button>
          </div>
          <div class="delivery-updated-at"></div>
        </div>

        ${exitBanner}

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
    const publisherOptions = Array.from(
      new Set((historyItem.rows || []).map(row => row.website).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const filterHtml = `
      <div class="delivery-filter-bar">
        <label>
          Filtrar publisher:
          <select
            class="delivery-publisher-filter"
            onchange="filterDeliveryPanelPublishers('${escapeHtml(historyItem.panelId)}', this.value)"
          >
            <option value="">Todos los publishers</option>
            ${publisherOptions.map(publisher => `
              <option value="${escapeHtml(publisher)}">${escapeHtml(publisher)}</option>
            `).join('')}
          </select>
        </label>

        <span
          class="delivery-filter-count"
          id="delivery-filter-count-${escapeHtml(historyItem.panelId)}"
        >
          Mostrando ${historyItem.rows.length} de ${historyItem.rows.length}
        </span>
      </div>
    `;

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
        ${filterHtml}

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

  const renderWorkQueueSection = ({
    sectionId,
    title,
    rows,
    description,
    emptyText
  }) => {
    const cards = rows.length
      ? rows.map(renderMasterDeliveryCard).join('')
      : `<div class="empty">${escapeHtml(emptyText)}</div>`;

    return `
      <section class="report-section work-queue-section" id="${escapeHtml(sectionId)}">
        <div class="section-title-row">
          <div>
            <h2>${escapeHtml(title)}</h2>
            <p class="section-description">${escapeHtml(description)}</p>
          </div>
          <button class="collapse-btn" onclick="toggleSectionBody('${escapeHtml(sectionId)}')">
            Colapsar / Expandir
          </button>
        </div>
        <div class="section-body" id="section-body-${escapeHtml(sectionId)}">
          <div class="master-summary-grid">
            <div class="master-metric metric-action">
              <strong data-master-count="actionable">0</strong>
              <span>Requieren acción</span>
            </div>
            <div class="master-metric metric-overdue">
              <strong data-master-count="overdue">0</strong>
              <span>Con retraso</span>
            </div>
            <div class="master-metric metric-overnight">
              <strong data-master-count="overnight">0</strong>
              <span>Amanecidos</span>
            </div>
            <div class="master-metric metric-closed">
              <strong data-master-count="closed">0</strong>
              <span>Cerrados</span>
            </div>
          </div>
          <div class="work-queue-toolbar">
            <label>
              Buscar
              <input type="search" placeholder="Cliente, publisher o estado..." oninput="filterWorkQueue('${escapeHtml(sectionId)}', this.value)">
            </label>
            <label>
              Mostrar
              <select onchange="filterWorkQueue('${escapeHtml(sectionId)}', null, this.value)">
                <option value="actionable">Solo pendientes</option>
                <option value="overnight">Solo amanecidos</option>
                <option value="all">Todos</option>
                <option value="closed">Solo cerrados</option>
              </select>
            </label>
            <button type="button" class="notification-btn" onclick="requestTrackingNotifications()">
              Activar alertas por hora
            </button>
          </div>
          <div class="work-queue-list" data-work-queue="${escapeHtml(sectionId)}">
            ${cards}
          </div>
        </div>
      </section>
    `;
  };

  const renderQueueExitSection = () => {
    const cards = queueExitRows.map(exit => {
      const fallbackStatus = exit.exitReason === 'COMPLETED_APPROVED'
        ? 'APPROVED'
        : exit.exitReason === 'SCREENSHOT_UPLOADED'
          ? 'COMPLETED_PENDING_APPROVAL'
          : 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD';

      return renderDeliveryCard({
        ...(exit.delivery || exit),
        key: exit.key,
        status: exit.delivery?.status || fallbackStatus,
        media: exit.delivery?.media || exit.media,
        screenshot: exit.delivery?.screenshot,
        screenshotTwo: exit.delivery?.screenshotTwo,
        existsInPosts: Boolean(exit.delivery?.existsInPosts),
        existsInScreenshots: Boolean(exit.delivery?.existsInScreenshots),
        existsInScreenshotsTwos: Boolean(exit.delivery?.existsInScreenshotsTwos),
        existsInApproved: Boolean(exit.delivery?.existsInApproved),
        existsInHistory: Boolean(exit.delivery?.existsInHistory),
        exitReason: exit.exitReason,
        workScope: 'exit'
      });
    }).join('');

    return `
      <section class="report-section" id="queue-exits">
        <div class="section-title-row">
          <div>
            <h2>Salieron de la cola</h2>
            <p class="section-description">Distingue aprobados, capturas subidas y desapariciones que necesitan revisión.</p>
          </div>
          <button class="collapse-btn" onclick="toggleSectionBody('queue-exits')">Colapsar / Expandir</button>
        </div>
        <div class="section-body" id="section-body-queue-exits">
          <div class="section-summary">Total de movimientos detectados: ${queueExitRows.length}</div>
          ${cards || '<div class="empty">No hay salidas nuevas de la cola.</div>'}
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
  <div
    class="freshness-warning freshness-warning-hidden"
    id="freshness-warning"
    role="alert"
    aria-live="assertive"
  >
    <div class="freshness-warning-icon" aria-hidden="true">⚠</div>
    <div>
      <div class="freshness-warning-title" id="freshness-warning-title"></div>
      <div class="freshness-warning-detail" id="freshness-warning-detail"></div>
    </div>
  </div>

  <h1>Reporte Integrado de Publishers</h1>

  <div class="generated-time">
    <span>Generado a las:</span>
    <strong id="generated-at-value">${escapeHtml(generatedAtRD)}</strong>
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
    <button class="tab-button active" onclick="showTab('master', this)">Master Dashboard (${masterDeliveries.length})</button>
    <button class="tab-button" onclick="showTab('todos', this)">Reporte completo (${allRows.length})</button>
    <button class="tab-button" onclick="showTab('after5pm', this)">5PM en adelante (${reminderRows.length})</button>
    <button class="tab-button" onclick="showTab('saturday', this)">Saturday advance (${saturdayRows.length})</button>
    <button class="tab-button" onclick="showTab('removed', this)">Removidos (${removedRows.length})</button>
    <button class="tab-button" onclick="showTab('delivery', this)">Screenshot Status Today (${filteredDeliveryMatcher ? filteredDeliveryMatcher.summary.pendingTotal : 0} pending)</button>
    <button class="tab-button" onclick="showTab('delivery-yesterday', this)">Screenshot Status Yesterday (${filteredYesterdayDeliveryMatcher ? filteredYesterdayDeliveryMatcher.summary.pendingTotal : 0} pending)</button>
    <button class="tab-button" onclick="showTab('important-clients', this)">Clientes importantes (${publisherConfigRows.length})</button>
  </div>

  ${renderWorkQueueSection({
    sectionId: 'master',
    title: 'Seguimiento de capturas - Mi trabajo ahora',
    rows: masterDeliveries,
    description: 'Estados de captura de hoy y pendientes amanecidos. Pulsa un estado solamente cuando necesites corregirlo.',
    emptyText: 'No hay anuncios que requieran seguimiento.'
  })}

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
    'saturday',
    `3. Saturday advance - ${tomorrowString}`,
    saturdayRows,
    'saturday'
  )}

  ${renderSection(
    'removed',
    '4. Removidos en esta versión',
    removedRows,
    '',
    { removedSection: true }
  )}

  ${renderDeliverySection({
    sectionId: 'delivery',
    sectionNumber: '5',
    title: 'Screenshot Status Today',
    matcher: filteredDeliveryMatcher,
    reportDateValue: reportDate,
    displayDate: todayString,
    label: 'Today'
  })}

  ${renderDeliverySection({
    sectionId: 'delivery-yesterday',
    sectionNumber: '6',
    title: 'Screenshot Status Yesterday',
    matcher: filteredYesterdayDeliveryMatcher,
    reportDateValue: yesterdayReportDate,
    displayDate: yesterdayString,
    label: 'Yesterday'
  })}

  ${renderImportantClientsSection()}

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
