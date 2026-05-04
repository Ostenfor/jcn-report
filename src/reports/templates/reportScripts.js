const buildReportScripts = ({
  reportDate,
  deliveryMatcher = null
}) => {
  const deliveryTotal = deliveryMatcher?.summary?.totalExpected || 0;
  const deliveryCompleted = deliveryMatcher?.summary?.completedTotal || 0;
  const deliveryPending = deliveryMatcher?.summary?.pendingTotal || 0;

  return `
    const REPORT_DATE = ${JSON.stringify(reportDate)};
    const STORAGE_VERSION = 'v4';

    const DELIVERY_TOTAL = ${JSON.stringify(deliveryTotal)};
    const DELIVERY_COMPLETED = ${JSON.stringify(deliveryCompleted)};
    const DELIVERY_PENDING = ${JSON.stringify(deliveryPending)};

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

    function showProgressFooter(type) {
      const whatsappFooter = document.getElementById('whatsapp-progress-footer');
      const deliveryFooter = document.getElementById('delivery-progress-footer');

      if (whatsappFooter) whatsappFooter.classList.add('hidden-footer');
      if (deliveryFooter) deliveryFooter.classList.add('hidden-footer');

      if (type === 'whatsapp' && whatsappFooter) {
        whatsappFooter.classList.remove('hidden-footer');
      }

      if (type === 'delivery' && deliveryFooter) {
        deliveryFooter.classList.remove('hidden-footer');
      }
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

      if (sectionId === 'todos' || sectionId === 'after5pm') {
        showProgressFooter('whatsapp');
        updateSectionMessages(sectionId);
        updateSectionStatus(sectionId);
        return;
      }

      if (sectionId === 'delivery') {
        showProgressFooter('delivery');
        updateDeliveryFooterProgress();
        return;
      }

      showProgressFooter('none');
      updateFixedFooterProgress(0, 0, 0, 0);
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

    function updateDeliveryFooterProgress() {
      const activePanel = document.querySelector('.delivery-history-panel.active-history-panel');

      const deliveryTotal = activePanel
        ? Number(activePanel.dataset.total || 0)
        : DELIVERY_TOTAL;

      const deliveryCompleted = activePanel
        ? Number(activePanel.dataset.completed || 0)
        : DELIVERY_COMPLETED;

      const deliveryPending = activePanel
        ? Number(activePanel.dataset.pending || 0)
        : DELIVERY_PENDING;

      const completedPercent = deliveryTotal === 0
        ? 0
        : Math.round((deliveryCompleted / deliveryTotal) * 100);

      const pendingPercent = deliveryTotal === 0
        ? 0
        : Math.round((deliveryPending / deliveryTotal) * 100);

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
      document.querySelectorAll('.delivery-history-panel').forEach(panel => {
        panel.classList.remove('active-history-panel');
      });

      const selectedPanel = document.getElementById('delivery-history-panel-' + reportDate);

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
    showProgressFooter('whatsapp');
    updateDeliveryFooterProgress();
  `;
};

module.exports = {
  buildReportScripts
};