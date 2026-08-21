const buildReportScripts = ({
  reportDate,
  generatedAtEpochMs,
  deliveryMatcher = null,
  yesterdayDeliveryMatcher = null
}) => {
  const deliveryTotal = deliveryMatcher?.summary?.totalExpected || 0;
  const deliveryCompleted = deliveryMatcher?.summary?.completedTotal || 0;
  const deliveryPending = deliveryMatcher?.summary?.pendingTotal || 0;

  const deliveryYesterdayTotal = yesterdayDeliveryMatcher?.summary?.totalExpected || 0;
  const deliveryYesterdayCompleted = yesterdayDeliveryMatcher?.summary?.completedTotal || 0;
  const deliveryYesterdayPending = yesterdayDeliveryMatcher?.summary?.pendingTotal || 0;

  return `
    const REPORT_DATE = ${JSON.stringify(reportDate)};
    const GENERATED_AT_EPOCH_MS = ${JSON.stringify(generatedAtEpochMs)};
    const REPORT_TIME_ZONE = 'America/Santo_Domingo';
    const STALE_WARNING_MS = 2 * 60 * 60 * 1000;
    const UNRELIABLE_WARNING_MS = 24 * 60 * 60 * 1000;
    const STORAGE_VERSION = 'v4';

    const DELIVERY_TOTAL = ${JSON.stringify(deliveryTotal)};
    const DELIVERY_COMPLETED = ${JSON.stringify(deliveryCompleted)};
    const DELIVERY_PENDING = ${JSON.stringify(deliveryPending)};

    const DELIVERY_YESTERDAY_TOTAL = ${JSON.stringify(deliveryYesterdayTotal)};
    const DELIVERY_YESTERDAY_COMPLETED = ${JSON.stringify(deliveryYesterdayCompleted)};
    const DELIVERY_YESTERDAY_PENDING = ${JSON.stringify(deliveryYesterdayPending)};

    const SENDED_PREFIX = 'jcn:' + STORAGE_VERSION + ':sended:' + REPORT_DATE + ':';
    const CONFIRMED_PREFIX = 'jcn:' + STORAGE_VERSION + ':publisher-confirmed:' + REPORT_DATE + ':';
    const DELIVERY_OVERRIDE_PREFIX = 'jcn:v5:delivery-override:';
    const DELIVERY_ALERT_PREFIX = 'jcn:v5:delivery-alert-hour:';
    const DELIVERY_EVENT_PREFIX = 'jcn:v6:delivery-events:' + REPORT_DATE + ':';
    const OVERNIGHT_COHORT_KEY = 'jcn:v6:overnight-cohort:' + REPORT_DATE;
    const OVERDUE_DISMISS_PREFIX = 'jcn:v6:overdue-dismiss:' + REPORT_DATE + ':';

    function getDateKeyForTimeZone(date, timeZone) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      const values = {};

      parts.forEach(part => {
        if (part.type !== 'literal') values[part.type] = part.value;
      });

      return values.year + '-' + values.month + '-' + values.day;
    }

    function formatFreshnessAge(ageMs) {
      const totalMinutes = Math.max(0, Math.floor(ageMs / 60000));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours < 1) return minutes + ' minutos';
      return hours + ' horas y ' + minutes + ' minutos';
    }

    function updateFreshnessWarning() {
      const warning = document.getElementById('freshness-warning');
      const title = document.getElementById('freshness-warning-title');
      const detail = document.getElementById('freshness-warning-detail');

      if (!warning || !title || !detail) return;

      const nowMs = Date.now();
      const currentRDDate = getDateKeyForTimeZone(new Date(nowMs), REPORT_TIME_ZONE);
      const generatedAtIsValid = Number.isFinite(GENERATED_AT_EPOCH_MS);
      const ageMs = generatedAtIsValid
        ? Math.max(0, nowMs - GENERATED_AT_EPOCH_MS)
        : Number.POSITIVE_INFINITY;
      const reportIsTodayInRD = REPORT_DATE === currentRDDate;
      const generatedLabel =
        document.getElementById('generated-at-value')?.innerText ||
        'fecha desconocida';

      warning.classList.remove(
        'freshness-warning-hidden',
        'freshness-warning-yellow',
        'freshness-warning-red'
      );

      if (
        !generatedAtIsValid ||
        !reportIsTodayInRD ||
        ageMs >= UNRELIABLE_WARNING_MS
      ) {
        warning.classList.add('freshness-warning-red');
        title.innerText = 'INFORMACIÓN NO CONFIABLE — ESTE REPORTE NO ESTÁ ACTUALIZADO';
        detail.innerText =
          'NO USES ESTOS DATOS PARA TRABAJAR. Reporte: ' +
          REPORT_DATE +
          ' | Fecha actual en República Dominicana: ' +
          currentRDDate +
          ' | Última actualización: ' +
          generatedLabel +
          (generatedAtIsValid
            ? ' (hace ' + formatFreshnessAge(ageMs) + ').'
            : '. No fue posible verificar cuándo se generó.');
        document.title = '⛔ REPORTE DESACTUALIZADO — JCN';
        return;
      }

      if (ageMs >= STALE_WARNING_MS) {
        warning.classList.add('freshness-warning-yellow');
        title.innerText = 'ATENCIÓN — EL REPORTE LLEVA MÁS DE 2 HORAS SIN ACTUALIZARSE';
        detail.innerText =
          'Verifica la automatización antes de confiar en cambios recientes. ' +
          'Última actualización: ' +
          generatedLabel +
          ' (hace ' +
          formatFreshnessAge(ageMs) +
          ').';
        document.title = '⚠ REPORTE CON RETRASO — JCN';
        return;
      }

      warning.classList.add('freshness-warning-hidden');
      document.title = 'Reporte Integrado de Publishers';
    }

    const masterSection = document.getElementById('master');
    if (masterSection) {
      masterSection.classList.add('active');
    }

    function escapeForHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    const DELIVERY_STATUS_LABELS = {
      APPROVED: 'Completado y aprobado',
      COMPLETED_PENDING_APPROVAL: 'Captura subida - falta aprobar',
      PENDING_SCREENSHOT: 'Captura pendiente',
      ACTIVE_NO_SCREENSHOT_RECORD: 'Activo - sin registro de captura',
      PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD: 'Desapareció - revisar',
      UNKNOWN: 'Requiere revisión',
      MANUAL_SCHEDULED: 'Programado',
      MANUAL_COMPLETED: 'Completado manualmente',
      NO_RESPONSE: 'Cliente no respondió',
      NEEDS_REVIEW: 'Requiere revisión manual',
      RESCHEDULED: 'Se movió',
      REMOVED_CANCELLED: 'Eliminado / cancelado'
    };

    const CLOSED_DELIVERY_STATUSES = new Set([
      'APPROVED',
      'MANUAL_COMPLETED',
      'RESCHEDULED',
      'REMOVED_CANCELLED'
    ]);

    const INTERRUPTED_DELIVERY_STATUSES = new Set([
      'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD',
      'UNKNOWN',
      'NEEDS_REVIEW',
      'NO_RESPONSE',
      'REMOVED_CANCELLED',
      'RESCHEDULED'
    ]);

    function getMention(sectionKey) {
      const checked = document.getElementById('mention-switch-' + sectionKey)?.checked;
      return checked ? '@ @' : '@';
    }

    function getMessage(sectionKey, mentionOverride = '') {
      const select = document.getElementById('message-select-' + sectionKey);
      const value = select ? select.value : 'hello';
      const mention = mentionOverride ? '@' + mentionOverride : getMention(sectionKey);

      if (value === 'hello') {
        return 'hello ' + mention + ' for today we have';
      }

      if (value === 'reminder') {
        return 'last friendly reminder for today ' + mention;
      }

      if (value === 'saturday') {
        return 'Hello ' + mention + ' these are the Saturday publications. Sending this friendly reminder in advance.';
      }

      if (value === 'updated') {
        return 'List updated ' + mention;
      }

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

    function getDeliveryOverride(deliveryKey) {
      if (!deliveryKey) return null;

      try {
        const raw = localStorage.getItem(DELIVERY_OVERRIDE_PREFIX + deliveryKey);
        const parsed = raw ? JSON.parse(raw) : null;

        return parsed;
      } catch (error) {
        return null;
      }
    }

    function getDeliveryEvents(deliveryKey) {
      if (!deliveryKey) return [];

      try {
        const raw = localStorage.getItem(DELIVERY_EVENT_PREFIX + deliveryKey);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }

    function appendDeliveryEvent(deliveryKey, event) {
      const events = getDeliveryEvents(deliveryKey);
      events.push({
        ...event,
        at: new Date().toISOString()
      });
      localStorage.setItem(
        DELIVERY_EVENT_PREFIX + deliveryKey,
        JSON.stringify(events.slice(-100))
      );
    }

    function saveDeliveryOverride(deliveryKey, value) {
      if (!deliveryKey) return;

      const previous = getDeliveryOverride(deliveryKey);
      const hasFlags = Boolean(value?.flags && Object.values(value.flags).some(Boolean));

      if (!value || (!value.status && !hasFlags)) {
        if (previous?.status || previous?.flags && Object.values(previous.flags).some(Boolean)) {
          appendDeliveryEvent(deliveryKey, {
            type: 'REVERTED',
            fromStatus: previous.status || 'MANUAL_FLAG',
            toStatus: 'AUTOMATIC'
          });
        }
        localStorage.removeItem(DELIVERY_OVERRIDE_PREFIX + deliveryKey);
      } else {
        const previousFlags = JSON.stringify(previous?.flags || {});
        const nextFlags = JSON.stringify(value.flags || {});
        if ((previous?.status || '') !== (value.status || '') || previousFlags !== nextFlags) {
          appendDeliveryEvent(deliveryKey, {
            type: 'MANUAL_CHANGE',
            fromStatus: previous?.status || 'AUTOMATIC',
            toStatus: value.status || 'MANUAL_FLAG',
            flags: value.flags || {}
          });
        }
        localStorage.setItem(
          DELIVERY_OVERRIDE_PREFIX + deliveryKey,
          JSON.stringify({
            status: value.status,
            flags: value.flags || {},
            note: value.note || '',
            rescheduledAt: value.rescheduledAt || '',
            updatedAt: new Date().toISOString()
          })
        );
      }

      updateDeliveryTracking();
    }

    function getEffectiveDeliveryState(element) {
      const deliveryKey = element?.dataset?.deliveryKey || '';
      const automaticStatus = element?.dataset?.autoStatus || 'UNKNOWN';
      const override = getDeliveryOverride(deliveryKey);
      const isMasterView = Boolean(element?.closest?.('#master, #master-history'));
      const masterAllowsOverride = override?.status === 'RESCHEDULED' &&
        INTERRUPTED_DELIVERY_STATUSES.has(automaticStatus);
      const status = automaticStatus === 'APPROVED'
        ? 'APPROVED'
        : isMasterView
          ? (masterAllowsOverride ? 'RESCHEDULED' : automaticStatus)
          : override?.status || automaticStatus;

      return {
        deliveryKey,
        automaticStatus,
        override,
        status,
        closed: CLOSED_DELIVERY_STATUSES.has(status)
      };
    }

    function parseScheduledEpoch(value) {
      const text = String(value || '').trim();
      const dashboardMatch = text.match(
        /^(\\d{2})\\/(\\d{2})\\/(\\d{4}),\\s*(\\d{1,2}):(\\d{2})\\s*(AM|PM)\\s*(EST|EDT)$/i
      );

      if (dashboardMatch) {
        const month = Number(dashboardMatch[1]);
        const day = Number(dashboardMatch[2]);
        const year = Number(dashboardMatch[3]);
        let hour = Number(dashboardMatch[4]);
        const minute = Number(dashboardMatch[5]);
        const ampm = dashboardMatch[6].toUpperCase();
        const zone = dashboardMatch[7].toUpperCase();

        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        const offsetHours = zone === 'EDT' ? 4 : 5;
        return Date.UTC(year, month - 1, day, hour + offsetHours, minute);
      }

      if (/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}/.test(text)) {
        const localDate = new Date(text);
        return localDate.getTime();
      }

      const fallback = new Date(text);
      return fallback.getTime();
    }

    function formatTrackingDuration(milliseconds) {
      const totalMinutes = Math.max(0, Math.floor(Math.abs(milliseconds) / 60000));
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      if (days > 0) return days + 'd ' + hours + 'h ' + minutes + 'm';
      if (hours > 0) return hours + 'h ' + minutes + 'm';
      return minutes + 'm';
    }

    function getStatusCssClass(status) {
      if (status === 'APPROVED' || status === 'MANUAL_COMPLETED') return 'status-approved';
      if (status === 'COMPLETED_PENDING_APPROVAL') return 'status-completed';
      if (status === 'REMOVED_CANCELLED') return 'status-cancelled';
      if (status === 'RESCHEDULED') return 'status-rescheduled';
      if (status === 'NO_RESPONSE') return 'status-no-response';
      if (status === 'UNKNOWN' || status === 'NEEDS_REVIEW' || status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD') return 'status-unknown';
      return 'status-pending';
    }

    function getJourneyStage(status, targetMs, nowMs) {
      if (status === 'APPROVED' || status === 'MANUAL_COMPLETED') return 'COMPLETED';
      if (status === 'COMPLETED_PENDING_APPROVAL') return 'SCREENSHOT_UPLOADED';
      if (status === 'RESCHEDULED') return 'MOVED';
      if (status === 'REMOVED_CANCELLED') return 'REMOVED';
      if (status === 'UNKNOWN' || status === 'NEEDS_REVIEW' || status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD') return 'REVIEW';
      if (status === 'PENDING_SCREENSHOT') return 'PENDING_CAPTURE';
      if (status === 'NO_RESPONSE') return 'PENDING_CAPTURE';
      if (status === 'MANUAL_SCHEDULED') return 'SCHEDULED';
      if (status === 'ACTIVE_NO_SCREENSHOT_RECORD') {
        return Number.isFinite(targetMs) && nowMs < targetMs ? 'SCHEDULED' : 'PENDING_CAPTURE';
      }
      return 'PENDING_CAPTURE';
    }

    function getHistoryResultLabel(status) {
      if (status === 'APPROVED' || status === 'MANUAL_COMPLETED') return 'Completado';
      if (status === 'RESCHEDULED') return 'Reprogramado';
      if (status === 'REMOVED_CANCELLED' || status === 'PREVIOUSLY_SEEN_REMOVED_FROM_DASHBOARD') return 'Removido';
      if (status === 'COMPLETED_PENDING_APPROVAL') return 'Captura subida';
      return DELIVERY_STATUS_LABELS[status] || status || 'Pendiente';
    }

    function renderDeliveryEvent(event) {
      const at = event.at ? new Date(event.at).toLocaleString() : 'Hora desconocida';
      const fromLabel = event.fromStatus === 'AUTOMATIC'
        ? 'Automático'
        : getHistoryResultLabel(event.fromStatus);
      const toLabel = event.toStatus === 'AUTOMATIC'
        ? 'Automático restaurado'
        : getHistoryResultLabel(event.toStatus);
      return '<div class="history-event-item"><strong>' + escapeForHtml(toLabel) + '</strong>' +
        '<span>' + escapeForHtml(fromLabel) + ' → ' + escapeForHtml(toLabel) + '</span>' +
        '<time>' + escapeForHtml(at) + '</time></div>';
    }

    function updateOneDeliveryElement(element, nowMs) {
      const state = getEffectiveDeliveryState(element);
      const override = state.override;
      const label = DELIVERY_STATUS_LABELS[state.status] || state.status;
      const targetValue = state.status === 'RESCHEDULED' && override?.rescheduledAt
        ? override.rescheduledAt
        : element.dataset.scheduled;
      const targetMs = parseScheduledEpoch(targetValue);
      const delayMs = Number.isFinite(targetMs) ? nowMs - targetMs : 0;
      const isOverdue = !state.closed && Number.isFinite(targetMs) && delayMs >= 0;
      const journeyStage = getJourneyStage(state.status, targetMs, nowMs);

      element.dataset.effectiveStatus = state.status;
      element.dataset.isClosed = state.closed ? 'true' : 'false';
      element.dataset.isOverdue = isOverdue ? 'true' : 'false';
      element.dataset.isInterrupted = INTERRUPTED_DELIVERY_STATUSES.has(state.status) ? 'true' : 'false';

      element.querySelectorAll('.tracking-inline-status').forEach(statusEl => {
        statusEl.innerText = label;
      });

      element.querySelectorAll('.delivery-status').forEach(statusEl => {
        statusEl.innerText = label;
        statusEl.className = 'delivery-status ' + getStatusCssClass(state.status);
      });

      const mainStages = ['SCHEDULED', 'PENDING_CAPTURE', 'SCREENSHOT_UPLOADED', 'COMPLETED'];
      const activeMainIndex = mainStages.indexOf(journeyStage);

      element.querySelectorAll('[data-stage]').forEach(step => {
        const stage = step.dataset.stage;
        const stageIndex = mainStages.indexOf(stage);
        step.classList.toggle('journey-active', stage === journeyStage);
        step.classList.toggle(
          'journey-done',
          (activeMainIndex >= 0 && stageIndex >= 0 && stageIndex < activeMainIndex) ||
          (activeMainIndex < 0 && stageIndex === 0)
        );
      });

      let timerText = 'Hora no disponible';

      if (state.closed) {
        timerText = 'Seguimiento cerrado';
      } else if (Number.isFinite(targetMs)) {
        timerText = delayMs >= 0
          ? 'Retraso: ' + formatTrackingDuration(delayMs)
          : 'Falta: ' + formatTrackingDuration(delayMs);
      }

      element.querySelectorAll('.tracking-inline-timer, .delivery-delay-clock').forEach(timer => {
        timer.innerText = timerText;
      });

      if (element.classList.contains('delivery-card')) {
        element.classList.remove(
          'status-approved',
          'status-completed',
          'status-pending',
          'status-missing',
          'status-unknown',
          'status-cancelled',
          'status-rescheduled',
          'status-no-response',
          'delay-level-1',
          'delay-level-2',
          'delay-level-3'
        );
        element.classList.add(getStatusCssClass(state.status));

        if (isOverdue) {
          const overdueHours = delayMs / 3600000;
          element.classList.add(
            overdueHours >= 3
              ? 'delay-level-3'
              : overdueHours >= 2
                ? 'delay-level-2'
                : overdueHours >= 1
                  ? 'delay-level-1'
                  : 'delay-level-1'
          );
        }
      }

      element.querySelectorAll('[data-delivery-flag]').forEach(flagButton => {
        const enabled = Boolean(
          override?.flags?.[flagButton.dataset.deliveryFlag] ||
          (flagButton.dataset.deliveryFlag === 'noResponse' && override?.status === 'NO_RESPONSE')
        );
        flagButton.classList.toggle('journey-active', enabled);
      });

      element.querySelectorAll('.delivery-status-select').forEach(select => {
        select.value = override?.status || '';
      });

      element.querySelectorAll('.delivery-note-input').forEach(input => {
        if (document.activeElement !== input) input.value = override?.note || '';
      });

      element.querySelectorAll('.delivery-reschedule-input').forEach(input => {
        if (document.activeElement !== input) input.value = override?.rescheduledAt || '';
        input.disabled = state.status !== 'RESCHEDULED';
      });

      element.querySelectorAll('.manual-override-badge').forEach(badge => {
        badge.innerText = override?.status
          ? 'Corrección manual activa'
          : 'Usando estado automático';
        badge.classList.toggle('manual-active', Boolean(override?.status));
      });

      element.querySelectorAll('.delivery-updated-at').forEach(updated => {
        updated.innerText = override?.updatedAt
          ? 'Cambio manual: ' + new Date(override.updatedAt).toLocaleString()
          : 'Detección automática: ' + (DELIVERY_STATUS_LABELS[state.automaticStatus] || state.automaticStatus);
      });

      element.querySelectorAll('.tracking-origin').forEach(origin => {
        origin.innerText = override?.status
          ? 'Ajustado por ti'
          : 'Detectado por el sistema';
        origin.classList.toggle('manual-active', Boolean(override?.status));
      });

      element.querySelectorAll('.history-status-label').forEach(statusEl => {
        statusEl.innerText = getHistoryResultLabel(state.status);
        statusEl.className = 'history-status-label ' + getStatusCssClass(state.status);
      });

      element.querySelectorAll('.history-status-source').forEach(sourceEl => {
        sourceEl.innerText = override?.status
          ? 'Marcado manualmente'
          : 'Detectado automáticamente';
      });

      element.querySelectorAll('.history-reschedule-btn').forEach(button => {
        const canReschedule = element.dataset.canReschedule === 'true';
        const isRescheduled = state.status === 'RESCHEDULED';
        button.hidden = !canReschedule && !isRescheduled;
        button.classList.toggle('reschedule-active', isRescheduled);
        button.innerText = isRescheduled ? 'Deshacer reprogramación' : 'Marcar: se reprogramó';
      });

      element.querySelectorAll('.history-delay-clock').forEach(clock => {
        if (state.closed || INTERRUPTED_DELIVERY_STATUSES.has(state.status)) {
          clock.innerText = state.status === 'RESCHEDULED' ? 'Cerrado como reprogramado' : 'Flujo cerrado o interrumpido';
        } else if (Number.isFinite(targetMs)) {
          clock.innerText = delayMs >= 0
            ? 'Sin resolver: ' + formatTrackingDuration(delayMs)
            : 'Programado en: ' + formatTrackingDuration(delayMs);
        } else {
          clock.innerText = 'Tiempo no disponible';
        }
      });

      const events = getDeliveryEvents(state.deliveryKey);
      element.querySelectorAll('.history-event-count').forEach(counter => {
        counter.innerText = events.length;
      });
      element.querySelectorAll('.history-events-list').forEach(list => {
        const automaticHistory = element.dataset.previousStatus
          ? '<div class="history-event-item automatic-event"><strong>Cambio detectado por el sistema</strong>' +
            '<span>' + escapeForHtml(element.dataset.previousStatus) + ' → ' + escapeForHtml(state.automaticStatus) + '</span>' +
            '<time>' + escapeForHtml(element.dataset.lastSeen || '') + '</time></div>'
          : '';
        list.innerHTML = events.length || automaticHistory
          ? automaticHistory + events.slice().reverse().map(renderDeliveryEvent).join('')
          : '<div class="history-event-empty">Sin cambios manuales. Se conserva el estado automático.</div>';
      });
    }

    function initializeOvernightCohort() {
      const section = document.getElementById('master');
      if (!section) return;

      const cards = Array.from(section.querySelectorAll('[data-master-group="overnight"] .delivery-card[data-delivery-key]'));
      let storedKeys = [];

      try {
        const raw = localStorage.getItem(OVERNIGHT_COHORT_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        storedKeys = Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        storedKeys = [];
      }

      const cohort = new Set(storedKeys);
      cards.forEach(card => {
        if (card.dataset.overnightCandidate === 'true') {
          cohort.add(card.dataset.deliveryKey);
        }
      });

      localStorage.setItem(OVERNIGHT_COHORT_KEY, JSON.stringify(Array.from(cohort)));

      let availableCount = 0;
      cards.forEach(card => {
        const belongs = cohort.has(card.dataset.deliveryKey);
        card.dataset.overnightCohort = belongs ? 'true' : 'false';
        if (belongs) availableCount += 1;
      });

      section.querySelectorAll('[data-overnight-cohort-count]').forEach(counter => {
        counter.innerText = availableCount;
      });

      const empty = section.querySelector('.overnight-cohort-empty');
      if (empty) empty.style.display = availableCount ? 'none' : '';
    }

    function updateMasterMetrics() {
      document.querySelectorAll('.work-queue-section').forEach(section => {
        const cards = Array.from(section.querySelectorAll('.delivery-card[data-delivery-key]'))
          .filter(card => card.dataset.workScope !== 'nocturnal' &&
            (card.dataset.workScope !== 'overnight' || card.dataset.overnightCohort === 'true') &&
            card.dataset.isInterrupted !== 'true' && card.dataset.isClosed !== 'true');
        const actionable = cards.filter(card => card.dataset.isClosed !== 'true').length;
        const overdue = cards.filter(card => card.dataset.isOverdue === 'true').length;
        const overnight = cards.filter(card => card.dataset.workScope === 'overnight' && card.dataset.isClosed !== 'true').length;
        const closed = cards.filter(card => card.dataset.isClosed === 'true').length;

        const values = { actionable, overdue, overnight, closed };
        section.querySelectorAll('[data-master-count]').forEach(counter => {
          counter.innerText = values[counter.dataset.masterCount] || 0;
        });
      });
    }

    function requestTrackingNotifications() {
      if (!('Notification' in window)) {
        showToast('Este navegador no permite notificaciones del sistema. Las alertas visuales seguirán activas.');
        return;
      }

      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Alertas por hora activadas.');
          new Notification('JCN Master Dashboard', {
            body: 'Las alertas de seguimiento están activas.'
          });
        } else {
          showToast('No se concedió permiso. Los relojes y colores seguirán funcionando.');
        }
      });
    }

    function getMasterOverdueAlerts(nowMs) {
      const unique = new Map();

      document.querySelectorAll('#master .delivery-card[data-delivery-key]').forEach(element => {
        if (element.dataset.workScope === 'nocturnal') return;
        if (element.dataset.workScope === 'overnight' && element.dataset.overnightCohort !== 'true') return;
        if (!unique.has(element.dataset.deliveryKey)) {
          unique.set(element.dataset.deliveryKey, element);
        }
      });

      const alerts = [];

      unique.forEach((element, deliveryKey) => {
        const state = getEffectiveDeliveryState(element);
        if (state.closed || INTERRUPTED_DELIVERY_STATUSES.has(state.status)) return;

        const targetValue = state.status === 'RESCHEDULED' && state.override?.rescheduledAt
          ? state.override.rescheduledAt
          : element.dataset.scheduled;
        const targetMs = parseScheduledEpoch(targetValue);
        if (!Number.isFinite(targetMs) || nowMs < targetMs) return;

        const overdueHours = Math.floor((nowMs - targetMs) / 3600000);
        if (overdueHours < 1) return;

        const title = element.querySelector('.delivery-title')?.innerText || 'Anuncio pendiente';
        const subtitle = element.querySelector('.delivery-subtitle')?.innerText || '';
        const durationText = formatTrackingDuration(nowMs - targetMs);
        const scope = element.dataset.workScope === 'overnight' ? 'yesterday' : 'today';
        const whatsappGroup = element.dataset.whatsappGroup || 'N/A';
        alerts.push({
          deliveryKey,
          element,
          title: title + (subtitle ? ' — ' + subtitle : ''),
          overdueHours,
          durationText,
          targetMs,
          scope,
          whatsappGroup
        });
      });

      return alerts.sort((a, b) => {
        if (a.scope !== b.scope) return a.scope === 'today' ? -1 : 1;
        return b.overdueHours - a.overdueHours || a.targetMs - b.targetMs;
      });
    }

    function updateOverdueAlertStack(nowMs) {
      const stack = document.getElementById('overdue-alert-stack');
      const list = document.getElementById('overdue-alert-list');
      if (!stack || !list) return;

      const visibleAlerts = getMasterOverdueAlerts(nowMs).filter(alert => {
        const dismissedHour = Number(localStorage.getItem(OVERDUE_DISMISS_PREFIX + alert.deliveryKey) || -1);
        return dismissedHour < alert.overdueHours;
      });

      if (!visibleAlerts.length) {
        stack.classList.add('overdue-alert-stack-hidden');
        list.innerHTML = '';
        return;
      }

      const renderAlert = alert => {
        const hasWhatsappGroup = alert.whatsappGroup && alert.whatsappGroup !== 'N/A';
        return '<div class="overdue-alert-item" data-overdue-key="' + escapeForHtml(alert.deliveryKey) +
          '" data-overdue-hour="' + alert.overdueHours +
          '" data-whatsapp-group="' + escapeForHtml(alert.whatsappGroup || 'N/A') + '">' +
          '<div class="overdue-alert-content"><strong>' + escapeForHtml(alert.title) + ' debe ser notificado</strong>' +
          '<span>Tiene ' + escapeForHtml(alert.durationText) + ' sin completarse.</span>' +
          '<span class="overdue-alert-group-name">Grupo: <strong>' + escapeForHtml(alert.whatsappGroup || 'N/A') + '</strong></span></div>' +
          '<div class="overdue-alert-actions">' +
            '<button type="button" class="overdue-copy-group-btn" onclick="copyTrackedWhatsappGroup(event, this)"' +
              (hasWhatsappGroup ? '' : ' disabled') + '>Copy Group</button>' +
            '<button type="button" class="overdue-dismiss-btn" aria-label="Cerrar alerta" onclick="dismissOverdueAlert(this)">×</button>' +
          '</div>' +
        '</div>';
      };

      const groups = [
        { scope: 'today', title: 'Pendientes de hoy' },
        { scope: 'yesterday', title: 'Pendientes de ayer / amanecidos' }
      ];

      list.innerHTML = groups.map(group => {
        const groupAlerts = visibleAlerts.filter(alert => alert.scope === group.scope);
        if (!groupAlerts.length) return '';
        return '<section class="overdue-alert-group overdue-alert-group-' + group.scope + '" data-alert-scope="' + group.scope + '">' +
          '<h3>' + group.title + ' <span>(' + groupAlerts.length + ')</span></h3>' +
          '<div class="overdue-alert-group-list">' + groupAlerts.map(renderAlert).join('') + '</div>' +
        '</section>';
      }).join('');
      stack.classList.remove('overdue-alert-stack-hidden');
    }

    async function copyTrackedWhatsappGroup(event, button) {
      if (event) event.stopPropagation();
      const source = button.closest('[data-whatsapp-group]');
      const groupName = source?.dataset.whatsappGroup || 'N/A';

      if (groupName === 'N/A') {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
        return;
      }

      try {
        await copyTextToClipboard(groupName);
        showToast('Grupo copiado:<br><strong>' + escapeForHtml(groupName) + '</strong>');
      } catch (error) {
        alert('No se pudo copiar el grupo automaticamente.');
      }
    }

    function dismissOverdueAlert(button) {
      const item = button.closest('.overdue-alert-item');
      if (!item) return;
      localStorage.setItem(
        OVERDUE_DISMISS_PREFIX + item.dataset.overdueKey,
        String(item.dataset.overdueHour || 0)
      );
      updateOverdueAlertStack(Date.now());
    }

    function dismissAllOverdueAlerts() {
      getMasterOverdueAlerts(Date.now()).forEach(alert => {
        localStorage.setItem(OVERDUE_DISMISS_PREFIX + alert.deliveryKey, String(alert.overdueHours));
      });
      updateOverdueAlertStack(Date.now());
    }

    function processDeliveryHourAlerts(nowMs) {
      const alerts = getMasterOverdueAlerts(nowMs);
      const newAlerts = [];

      alerts.forEach(alert => {
        const { deliveryKey, title, overdueHours } = alert;

        const storageKey = DELIVERY_ALERT_PREFIX + deliveryKey;
        const lastAlertedHour = Number(localStorage.getItem(storageKey) || 0);
        if (overdueHours <= lastAlertedHour) return;

        localStorage.setItem(storageKey, String(overdueHours));
        newAlerts.push({ title, overdueHours });
      });

      if (!newAlerts.length) return;

      const newest = newAlerts[newAlerts.length - 1];
      showToast(
        '<strong>Seguimiento vencido:</strong><br>' +
        escapeForHtml(newest.title) + ' lleva ' + newest.overdueHours + 'h de retraso.' +
        (newAlerts.length > 1 ? '<br>Hay ' + newAlerts.length + ' alertas nuevas.' : '')
      );

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('JCN: seguimiento de ' + newest.overdueHours + 'h', {
          body: newest.title + (newAlerts.length > 1 ? ' y ' + (newAlerts.length - 1) + ' más.' : '')
        });
      }
    }

    function updateDeliveryTracking() {
      const nowMs = Date.now();
      document.querySelectorAll('.delivery-trackable[data-delivery-key]').forEach(element => {
        updateOneDeliveryElement(element, nowMs);
      });
      updateMasterMetrics();
      document.querySelectorAll('.work-queue-section').forEach(section => {
        filterWorkQueue(section.id);
      });
      updateOverdueAlertStack(nowMs);
      processDeliveryHourAlerts(nowMs);
      updateDeliveryFooterProgress();
    }

    function setDeliveryStage(event, button) {
      if (event) event.stopPropagation();
      const trackable = button.closest('.delivery-trackable');
      if (!trackable) return;

      const statusByStage = {
        SCHEDULED: 'MANUAL_SCHEDULED',
        PENDING_CAPTURE: 'PENDING_SCREENSHOT',
        SCREENSHOT_UPLOADED: 'COMPLETED_PENDING_APPROVAL',
        COMPLETED: 'MANUAL_COMPLETED',
        MOVED: 'RESCHEDULED',
        REMOVED: 'REMOVED_CANCELLED',
        REVIEW: 'NEEDS_REVIEW'
      };
      const status = statusByStage[button.dataset.stage];
      if (!status) return;

      const deliveryKey = trackable.dataset.deliveryKey;
      const current = getDeliveryOverride(deliveryKey) || {};
      saveDeliveryOverride(deliveryKey, {
        ...current,
        status
      });
      if (CLOSED_DELIVERY_STATUSES.has(status)) {
        showToast('Cambio guardado. El anuncio sigue en Registro del día y puedes revertirlo allí.');
      } else {
        showToast('Estado actualizado por ti en todas las vistas.');
      }
    }

    function toggleDeliveryFlag(event, button) {
      if (event) event.stopPropagation();
      const trackable = button.closest('.delivery-trackable');
      if (!trackable) return;

      const deliveryKey = trackable.dataset.deliveryKey;
      const current = getDeliveryOverride(deliveryKey) || {};
      const flagName = button.dataset.deliveryFlag;
      const flags = {
        ...(current.flags || {}),
        [flagName]: !current.flags?.[flagName]
      };

      saveDeliveryOverride(deliveryKey, {
        ...current,
        flags
      });
      showToast(flags[flagName] ? 'Marcado: no respondió.' : 'Marca removida.');
    }

    function toggleHistoryRescheduled(button) {
      const trackable = button.closest('.delivery-trackable');
      if (!trackable || trackable.dataset.canReschedule !== 'true') return;

      const state = getEffectiveDeliveryState(trackable);
      if (state.status === 'RESCHEDULED') {
        saveDeliveryOverride(trackable.dataset.deliveryKey, null);
        showToast('Se deshizo la marca de reprogramación. El registro automático permanece.');
        return;
      }

      saveDeliveryOverride(trackable.dataset.deliveryKey, {
        status: 'RESCHEDULED',
        flags: {},
        note: 'Reprogramado desde Registro del día'
      });
      showToast('Registro marcado como reprogramado.');
    }

    function setDeliveryManualStatus(select) {
      const trackable = select.closest('.delivery-trackable');
      if (!trackable) return;

      const deliveryKey = trackable.dataset.deliveryKey;
      const current = getDeliveryOverride(deliveryKey) || {};

      if (!select.value) {
        saveDeliveryOverride(deliveryKey, null);
        showToast('El anuncio volvió al estado automático.');
        return;
      }

      saveDeliveryOverride(deliveryKey, {
        ...current,
        status: select.value
      });
      showToast('Estado manual guardado en todas las vistas.');
    }

    function saveDeliveryControl(control) {
      const trackable = control.closest('.delivery-trackable');
      if (!trackable) return;

      const deliveryKey = trackable.dataset.deliveryKey;
      const current = getDeliveryOverride(deliveryKey) || {};
      const selectedStatus = trackable.querySelector('.delivery-status-select')?.value || current.status || '';
      const note = trackable.querySelector('.delivery-note-input')?.value || current.note || '';
      const rescheduledAt = trackable.querySelector('.delivery-reschedule-input')?.value || current.rescheduledAt || '';

      if (!selectedStatus) {
        showToast('Selecciona primero un estado manual.');
        updateDeliveryTracking();
        return;
      }

      saveDeliveryOverride(deliveryKey, {
        ...current,
        status: selectedStatus,
        note,
        rescheduledAt
      });
      showToast('Control manual actualizado.');
    }

    function returnDeliveryToAutomatic(button) {
      const trackable = button.closest('.delivery-trackable');
      if (!trackable) return;
      saveDeliveryOverride(trackable.dataset.deliveryKey, null);
      showToast('Se restauró la detección automática.');
    }

    function filterWorkQueue(sectionId, query, mode) {
      const section = document.getElementById(sectionId);
      if (!section) return;

      if (query !== null && query !== undefined) section.dataset.queueSearch = String(query).trim().toLowerCase();
      if (mode) section.dataset.queueMode = mode;

      const search = section.dataset.queueSearch || '';
      const selectedMode = section.dataset.queueMode || 'actionable';

      section.querySelectorAll('.work-queue-list .delivery-card').forEach(card => {
        const closed = card.dataset.isClosed === 'true';
        const isOvernight = card.dataset.workScope === 'overnight';
        const belongsToOvernightCohort = !isOvernight || card.dataset.overnightCohort === 'true';
        const interrupted = card.dataset.isInterrupted === 'true';
        const matchesMode = belongsToOvernightCohort && !closed && !interrupted;
        const matchesSearch = !search || card.innerText.toLowerCase().includes(search);
        card.style.display = matchesMode && matchesSearch ? '' : 'none';
      });
    }

    function openMasterForDelivery(event, source) {
      if (event) event.stopPropagation();
      const trackable = source.closest('.delivery-trackable');
      if (!trackable) return;

      const masterButton = Array.from(document.querySelectorAll('.tab-button'))
        .find(button => button.getAttribute('onclick')?.includes("'master'"));
      showTab('master', masterButton);

      const deliveryKey = trackable.dataset.deliveryKey;
      const target = Array.from(document.querySelectorAll('#master .delivery-card'))
        .find(card => card.dataset.deliveryKey === deliveryKey);

      if (target) {
        const master = document.getElementById('master');
        master.dataset.queueMode = 'all';
        filterWorkQueue('master');
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('tracking-highlight');
        setTimeout(() => target.classList.remove('tracking-highlight'), 2200);
      }
    }

    function showProgressFooter(type) {
      const whatsappFooter = document.getElementById('whatsapp-progress-footer');
      const deliveryFooter = document.getElementById('delivery-progress-footer');

      if (whatsappFooter) {
        whatsappFooter.classList.add('hidden-footer');
      }

      if (deliveryFooter) {
        deliveryFooter.classList.add('hidden-footer');
      }

      if (type === 'whatsapp' && whatsappFooter) {
        whatsappFooter.classList.remove('hidden-footer');
      }

      if (type === 'delivery' && deliveryFooter) {
        deliveryFooter.classList.remove('hidden-footer');
      }
    }

    function isDeliverySection(sectionId) {
      return sectionId === 'master' ||
        sectionId === 'master-history' ||
        sectionId === 'overnight' ||
        sectionId === 'queue-exits' ||
        sectionId === 'delivery' ||
        sectionId === 'delivery-yesterday';
    }

    function showTab(sectionId, button) {
      document.querySelectorAll('.report-section').forEach(section => {
        section.classList.remove('active');
      });

      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });

      const target = document.getElementById(sectionId);
      if (target) {
        target.classList.add('active');
      }

      if (button) {
        button.classList.add('active');
      }

      if (sectionId === 'todos' || sectionId === 'after5pm' || sectionId === 'saturday') {
        showProgressFooter('whatsapp');
        updateSectionMessages(sectionId);
        updateSectionStatus(sectionId);
        return;
      }

      if (isDeliverySection(sectionId)) {
        showProgressFooter('delivery');
        updateDeliveryTracking();
        updateDeliveryFooterProgress();
        return;
      }

      showProgressFooter('none');
      updateFixedFooterProgress(0, 0, 0, 0);
    }

    function getActiveSectionKey() {
      const active = document.querySelector('.report-section.active');
      return active ? active.id : 'master';
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
          key.startsWith('jcn:v3:publisher-confirmed:' + REPORT_DATE + ':')
        )
        .forEach(key => localStorage.removeItem(key));

      document.querySelectorAll('.publisher-card').forEach(card => {
        card.classList.remove('sended');
        card.classList.remove('confirmed');
      });

      document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
      });

      updateAllSectionStatuses();
      updateSectionStatus(getActiveSectionKey());
      showToast('Progreso de hoy reseteado.');
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
      if (event) {
        event.stopPropagation();
      }

      const groupName = getWhatsappGroupFromCard(sectionKey, index);
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (groupName && groupName !== 'N/A') {
        showToast('Busca este grupo:<br><strong>' + escapeForHtml(groupName) + '</strong>');
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
      if (checkbox) {
        checkbox.checked = checked;
      }
    }

    function updateAllSectionStatuses() {
      updateSectionStatus('todos');
      updateSectionStatus('after5pm');
      updateSectionStatus('saturday');
    }

    function applySendedState(sentKey, checked) {
      document.querySelectorAll('.publisher-card[data-requires-notification="true"]').forEach(card => {
        if (card.dataset.sentKey !== sentKey) return;

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
      document.querySelectorAll('.publisher-card[data-requires-notification="true"]').forEach(card => {
        if (card.dataset.confirmKey !== confirmKey) return;

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
      const confirmedPercent = totalClients === 0 ? 0 : Math.round((confirmedClients / totalClients) * 100);
      const sendedPercent = activeTotal === 0 ? 0 : Math.round((sendedClients / activeTotal) * 100);

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

    function updateDeliveryFooterProgress() {
      const activeSection = document.querySelector('.report-section.active');
      const activePanel = activeSection
        ? activeSection.querySelector('.delivery-history-panel.active-history-panel')
        : document.querySelector('.delivery-history-panel.active-history-panel');

      const activeSectionId = activeSection ? activeSection.id : '';

      const activeTrackingCards = activeSection
        ? Array.from(activeSection.querySelectorAll('.delivery-card[data-delivery-key]')).filter(card =>
            card.dataset.workScope !== 'nocturnal' &&
            (card.dataset.workScope !== 'overnight' || card.dataset.overnightCohort === 'true') &&
            card.dataset.isInterrupted !== 'true'
          )
        : [];

      const useLiveTrackingCounts = activeSectionId === 'master' ||
        activeSectionId === 'overnight' ||
        activeSectionId === 'queue-exits';

      const deliveryTotal = useLiveTrackingCounts
        ? activeTrackingCards.length
        : activePanel
        ? Number(activePanel.dataset.total || 0)
        : activeSectionId === 'delivery-yesterday'
          ? DELIVERY_YESTERDAY_TOTAL
          : DELIVERY_TOTAL;

      const deliveryCompleted = useLiveTrackingCounts
        ? activeTrackingCards.filter(card => card.dataset.isClosed === 'true').length
        : activePanel
        ? Number(activePanel.dataset.completed || 0)
        : activeSectionId === 'delivery-yesterday'
          ? DELIVERY_YESTERDAY_COMPLETED
          : DELIVERY_COMPLETED;

      const deliveryPending = useLiveTrackingCounts
        ? activeTrackingCards.filter(card => card.dataset.isClosed !== 'true').length
        : activePanel
        ? Number(activePanel.dataset.pending || 0)
        : activeSectionId === 'delivery-yesterday'
          ? DELIVERY_YESTERDAY_PENDING
          : DELIVERY_PENDING;

      const completedPercent = deliveryTotal === 0 ? 0 : Math.round((deliveryCompleted / deliveryTotal) * 100);
      const pendingPercent = deliveryTotal === 0 ? 0 : Math.round((deliveryPending / deliveryTotal) * 100);

      const completedCount = document.getElementById('footer-delivery-completed-count');
      const completedTotal = document.getElementById('footer-delivery-completed-total');
      const completedFill = document.getElementById('footer-delivery-completed-fill');

      const pendingCount = document.getElementById('footer-delivery-pending-count');
      const pendingTotal = document.getElementById('footer-delivery-pending-total');
      const pendingFill = document.getElementById('footer-delivery-pending-fill');

      if (completedCount) completedCount.innerText = deliveryCompleted;
      if (completedTotal) completedTotal.innerText = deliveryTotal;

      if (completedFill) {
        completedFill.style.width = completedPercent + '%';
        completedFill.style.background = getProgressColor(completedPercent);
      }

      if (pendingCount) pendingCount.innerText = deliveryPending;
      if (pendingTotal) pendingTotal.innerText = deliveryTotal;

      if (pendingFill) {
        pendingFill.style.width = pendingPercent + '%';
        pendingFill.style.background = getProgressColorSended(pendingPercent);
      }
    }

    function showDeliveryHistoryDay(reportDate) {
      const activeSection = document.querySelector('.report-section.active') || document;

      activeSection.querySelectorAll('.delivery-history-panel').forEach(panel => {
        panel.classList.remove('active-history-panel');
      });

      const selectedPanel = activeSection.querySelector('#delivery-history-panel-' + reportDate);

      if (selectedPanel) {
        selectedPanel.classList.add('active-history-panel');
      }

      updateDeliveryFooterProgress();
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
      if (pendingCounter) {
        pendingCounter.innerText = pendingPublishers.length;
      }

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
      textarea.style.top = '-9999px';
      textarea.setAttribute('readonly', '');

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
        return;
      }

      fallbackCopyText(text);
    }

    async function copyWhatsappGroup(event, sectionKey, index) {
      if (event) {
        event.stopPropagation();
      }

      const groupName = getWhatsappGroupFromCard(sectionKey, index);

      if (!groupName || groupName === 'N/A') {
        showToast('Este publisher no tiene grupo WhatsApp mapeado.');
        return;
      }

      try {
        await copyTextToClipboard(groupName);
        showToast('Grupo copiado:<br><strong>' + escapeForHtml(groupName) + '</strong>');
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

        if (title) {
          title.classList.add('copied');
        }

        if (copiedMsg) {
          copiedMsg.style.display = 'inline';
        }

        showToast('Mensaje copiado ✅');

        setTimeout(() => {
          if (copiedMsg) {
            copiedMsg.style.display = 'none';
          }
        }, 2000);
      } catch (error) {
        alert('No se pudo copiar automáticamente. Puedes copiar manualmente.');
      }
    }

    function filterDeliveryPanelPublishers(panelId, publisherName) {
      const panel = document.getElementById('delivery-history-panel-' + panelId);
      if (!panel) return;

      const cards = Array.from(panel.querySelectorAll('.delivery-card'));
      let visibleCount = 0;

      cards.forEach(card => {
        const cardPublisher = card.dataset.deliveryPublisher || '';
        const shouldShow = !publisherName || cardPublisher === publisherName;

        card.style.display = shouldShow ? '' : 'none';

        if (shouldShow) {
          visibleCount += 1;
        }
      });

      const countEl = document.getElementById('delivery-filter-count-' + panelId);

      if (countEl) {
        const total = cards.length;
        const label = publisherName || 'Todos los publishers';
        countEl.innerText = 'Mostrando ' + visibleCount + ' de ' + total + ' | ' + label;
      }
    }

    function filterImportantClients(query) {
      const normalized = String(query || '').trim().toLowerCase();
      const grid = document.getElementById('important-client-grid');
      if (!grid) return;

      const cards = Array.from(grid.querySelectorAll('.important-client-card'));
      let visibleCount = 0;

      cards.forEach(card => {
        const searchText = card.dataset.clientSearch || '';
        const shouldShow = !normalized || searchText.includes(normalized);
        card.style.display = shouldShow ? '' : 'none';

        if (shouldShow) {
          visibleCount += 1;
        }
      });

      const count = document.getElementById('important-client-count');
      if (count) {
        count.innerText = visibleCount + ' de ' + cards.length;
      }
    }

    updateSectionMessages('todos');
    updateSectionMessages('after5pm');
    updateSectionMessages('saturday');
    restoreSavedStates();
    initializeOvernightCohort();
    updateAllSectionStatuses();
    updateSectionStatus('todos');
    updateDeliveryTracking();
    showProgressFooter('delivery');
    updateDeliveryFooterProgress();
    updateFreshnessWarning();
    window.setInterval(updateFreshnessWarning, 60000);
    window.setInterval(updateDeliveryTracking, 60000);
  `;
};

module.exports = {
  buildReportScripts
};
