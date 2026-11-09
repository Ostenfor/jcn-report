const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const HOST = '127.0.0.1';
const PORT = Number(process.env.WHATSAPP_ASSISTANT_PORT || 3210);
const PROFILE_DIR = path.join(process.cwd(), '.whatsapp-profile');
const MAX_BODY_BYTES = 1024 * 1024;

let contextPromise = null;
let activeRun = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Private-Network': 'true'
};

const sendJson = (response, statusCode, value) => {
  response.writeHead(statusCode, {
    ...corsHeaders,
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(value));
};

const readJsonBody = (request) => new Promise((resolve, reject) => {
  let body = '';

  request.on('data', chunk => {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      reject(new Error('La solicitud es demasiado grande.'));
      request.destroy();
    }
  });

  request.on('end', () => {
    try {
      resolve(JSON.parse(body || '{}'));
    } catch (error) {
      reject(new Error('La solicitud no contiene JSON válido.'));
    }
  });

  request.on('error', reject);
});

const getContext = async () => {
  if (!contextPromise) {
    contextPromise = chromium.launchPersistentContext(PROFILE_DIR, {
      channel: 'msedge',
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--start-maximized']
    }).then(context => {
      context.setDefaultTimeout(10000);
      return context;
    }).catch(error => {
      contextPromise = null;
      throw error;
    });
  }

  return contextPromise;
};

const getWhatsAppPage = async () => {
  const context = await getContext();
  let page = context.pages().find(candidate => candidate.url().includes('web.whatsapp.com'));

  if (!page) {
    page = await context.newPage();
    await page.goto('https://web.whatsapp.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  }

  await page.bringToFront();
  if (!await findSidebarSearch(page)) {
    const chatNavigationCandidates = [
      page.getByRole('button', { name: /^Chats$/i }),
      page.getByLabel(/^Chats$/i)
    ];
    for (const candidate of chatNavigationCandidates) {
      const chatsControl = candidate.first();
      if (await chatsControl.isVisible().catch(() => false)) {
        await chatsControl.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(500);
        break;
      }
    }
  }
  return page;
};

const findSidebarSearch = async (page) => {
  const candidates = [
    page.locator('input[aria-label="Search or start a new chat"]'),
    page.locator('input[role="textbox"][data-tab="3"]'),
    page.locator('#side [contenteditable="true"][role="textbox"]'),
    page.getByRole('textbox', { name: /search/i }),
    page.locator('[data-testid="chat-list-search"] [contenteditable="true"]')
  ];

  for (const candidate of candidates) {
    const first = candidate.first();
    if (await first.isVisible().catch(() => false)) return first;
  }

  return null;
};

const waitForWhatsAppReady = async (page) => {
  const deadline = Date.now() + 60 * 1000;

  while (Date.now() < deadline) {
    const search = await findSidebarSearch(page);
    if (search) return search;
    await page.waitForTimeout(1000);
  }

  throw new Error('WhatsApp Web no quedó listo. Escanea el QR y vuelve a intentar.');
};

const getExactVisibleTextMatches = async (page, text) => {
  const titleMatches = page.getByTitle(text, { exact: true });
  const matches = await titleMatches.count()
    ? titleMatches
    : page.getByText(text, { exact: true });
  const visible = [];

  for (let index = 0; index < await matches.count(); index += 1) {
    const candidate = matches.nth(index);
    if (await candidate.isVisible().catch(() => false)) visible.push(candidate);
  }

  return visible;
};

const getComposer = async (page) => {
  const candidates = [
    page.locator('footer [contenteditable="true"][role="textbox"]'),
    page.locator('footer div[contenteditable="true"]'),
    page.locator('[data-testid="conversation-compose-box-input"]')
  ];

  for (const candidate of candidates) {
    const last = candidate.last();
    if (await last.isVisible().catch(() => false)) return last;
  }

  return null;
};

const normalizeDraftText = (value) => String(value || '')
  .replace(/\u00a0/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .trim();

const getPlainMentionVersion = (message, mentions) => {
  return (mentions || []).reduce((result, mention) => {
    return result.replace(`@${mention}`, '@');
  }, message);
};

const findMentionOption = async (page, mention) => {
  const selectors = [
    '[role="listbox"] [role="option"]',
    '[role="listbox"] [role="button"]',
    '[data-animate-dropdown-menu="true"] [role="button"]'
  ];

  const targetDigits = String(mention || '').replace(/\D/g, '').slice(-10);
  const matches = [];
  const visibleOptions = [];

  for (const selector of selectors) {
    const candidates = page.locator(selector);
    for (let index = 0; index < await candidates.count(); index += 1) {
      const candidate = candidates.nth(index);
      if (!await candidate.isVisible().catch(() => false)) continue;
      visibleOptions.push(candidate);

      const text = String(await candidate.innerText().catch(() => ''));
      const digits = text.replace(/\D/g, '');
      if (targetDigits && digits.slice(-10) === targetDigits) matches.push(candidate);
    }

    if (matches.length) break;
  }

  if (matches.length === 1) return matches[0];
  if (matches.length === 0 && visibleOptions.length === 1) return visibleOptions[0];

  const textMatches = page.getByText(mention, { exact: false });
  const visibleTextMatches = [];
  for (let index = 0; index < await textMatches.count(); index += 1) {
    const candidate = textMatches.nth(index);
    if (!await candidate.isVisible().catch(() => false)) continue;
    const belongsToHistory = await candidate.evaluate(element => Boolean(
      element.closest('[data-testid="msg-container"]')
    ));
    if (!belongsToHistory) visibleTextMatches.push(candidate);
  }

  if (visibleTextMatches.length === 1) return visibleTextMatches[0];

  const authors = page.locator('[data-testid="author"]');
  const visibleAuthors = [];
  for (let index = 0; index < await authors.count(); index += 1) {
    const candidate = authors.nth(index);
    if (!await candidate.isVisible().catch(() => false)) continue;
    const excluded = await candidate.evaluate(element => Boolean(
      element.closest('[data-testid="msg-container"]') || element.closest('#side')
    ));
    if (!excluded) visibleAuthors.push(candidate);
  }

  if (visibleAuthors.length === 1) return visibleAuthors[0];
  return null;
};

const getMentionSearchText = (mention) => {
  const phoneDigits = String(mention || '').replace(/\D/g, '');
  if (phoneDigits.length >= 7) {
    const localDigits = phoneDigits.slice(-7);
    return `${localDigits.slice(0, 3)}-${localDigits.slice(3)}`;
  }

  return String(mention || '').trim().slice(0, 8);
};

const clearComposer = async (page, composer) => {
  await composer.press('Escape').catch(() => {});
  await composer.click().catch(() => {});
  await composer.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A').catch(() => {});
  await composer.press('Backspace').catch(() => {});
  await composer.fill('').catch(() => {});
  await page.waitForTimeout(150);
};

const isPartialProbeDraft = (text, item) => {
  if (!item.probeOnly || text.includes('\n')) return false;
  const normalized = normalizeDraftText(text);
  if (!normalized.startsWith('hello @')) return false;

  return item.mentions.some(mention => {
    const mentionDigits = String(mention).replace(/\D/g, '');
    const textDigits = normalized.replace(/\D/g, '');
    return mentionDigits.length >= 7 && textDigits.endsWith(mentionDigits.slice(-7));
  });
};

const fillDraftWithActiveMentions = async (page, composer, item) => {
  const mentions = item.mentions || [];
  const mentionSearches = item.mentionSearches || [];
  let cursor = 0;

  await composer.fill('');

  for (let index = 0; index < mentions.length; index += 1) {
    const mention = mentions[index];
    const marker = `@${mention}`;
    const markerIndex = item.message.indexOf(marker, cursor);

    if (markerIndex < 0) {
      await clearComposer(page, composer);
      throw new Error(`El mensaje no contiene el marcador esperado para ${mention}.`);
    }

    const textBeforeMention = item.message.slice(cursor, markerIndex);
    if (index === 0) {
      await composer.fill(textBeforeMention);
    } else {
      await composer.press('End');
      await page.keyboard.insertText(textBeforeMention);
    }

    await composer.press('End');
    await composer.pressSequentially('@', { delay: 45 });
    const mentionSearchText = mentionSearches[index] || getMentionSearchText(mention);
    await composer.pressSequentially(mentionSearchText, { delay: 80 });
    await page.waitForTimeout(800);

    const option = await findMentionOption(page, mention);
    if (!option) {
      await clearComposer(page, composer);
      throw new Error(`No se encontró una coincidencia única para ${mention}.`);
    }

    await option.click();
    await page.waitForTimeout(300);

    cursor = markerIndex + marker.length;
  }

  await composer.press('End');
  await page.keyboard.insertText(item.message.slice(cursor));

};

const prepareOneDraft = async (page, item) => {
  const search = await waitForWhatsAppReady(page);
  await search.click();
  await search.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await search.fill(item.group);
  await page.waitForTimeout(1200);

  const matches = await getExactVisibleTextMatches(page, item.group);
  if (matches.length !== 1) {
    return {
      publisher: item.publisher,
      group: item.group,
      status: 'NEEDS_REVIEW',
      detail: matches.length === 0 ? 'Grupo no encontrado.' : 'Nombre de grupo ambiguo.'
    };
  }

  const resultRow = page.getByRole('row').filter({ has: matches[0] }).first();
  if (await resultRow.count()) {
    await resultRow.click({ timeout: 10000 });
  } else {
    await matches[0].click({ timeout: 10000 });
  }
  await page.waitForTimeout(700);

  const composer = await getComposer(page);
  if (!composer) {
    return {
      publisher: item.publisher,
      group: item.group,
      status: 'FAILED',
      detail: 'No se encontró el cuadro de escritura.'
    };
  }

  const existingText = String(await composer.innerText().catch(() => '')).trim();
  if (existingText) {
    const replaceableTestDraft = item.mentions.length > 0 &&
      normalizeDraftText(existingText) === normalizeDraftText(getPlainMentionVersion(item.message, item.mentions));
    const partialProbeDraft = isPartialProbeDraft(existingText, { ...item, probeOnly: true });

    if (item.cleanupOnly && (replaceableTestDraft || partialProbeDraft)) {
      await clearComposer(page, composer);
      return {
        publisher: item.publisher,
        group: item.group,
        status: 'CLEANED',
        detail: 'Se borró únicamente el texto residual de la prueba. No se envió nada.'
      };
    }

    if (!replaceableTestDraft && !partialProbeDraft) {
      return {
        publisher: item.publisher,
        group: item.group,
        status: 'NEEDS_REVIEW',
        detail: 'El chat ya tenía un borrador; no fue modificado.'
      };
    }
  }

  if (item.cleanupOnly) {
    return {
      publisher: item.publisher,
      group: item.group,
      status: 'CLEANED',
      detail: 'El chat no tenía texto residual para borrar.'
    };
  }

  await clearComposer(page, composer);

  try {
    if (item.mentions.length) {
      await fillDraftWithActiveMentions(page, composer, item);
    } else {
      await composer.fill(item.message);
    }
  } catch (error) {
    return {
      publisher: item.publisher,
      group: item.group,
      status: 'NEEDS_REVIEW',
      detail: error.message
    };
  }

  const preparedText = String(await composer.innerText().catch(() => '')).trim();

  if (!preparedText) {
    return {
      publisher: item.publisher,
      group: item.group,
      status: 'FAILED',
      detail: 'WhatsApp no conservó el texto del borrador.'
    };
  }

  return {
    publisher: item.publisher,
    group: item.group,
    status: 'PREPARED',
    detail: item.mentions.length
      ? `Borrador preparado con ${item.mentions.length} mención(es) activa(s). No se envió.`
      : 'Borrador preparado. No se envió.'
  };
};

const validateItems = (payload) => {
  if (payload?.confirmNoSend !== true) {
    throw new Error('Falta la confirmación de modo sin envío.');
  }

  if (!['todos', 'after5pm', 'saturday'].includes(payload.section)) {
    throw new Error('La sección solicitada no es válida.');
  }

  if (payload.section === 'saturday' && payload.isFriday !== true) {
    throw new Error('Los borradores del sábado solo se preparan los viernes.');
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('No hay mensajes para preparar.');
  }

  return payload.items.map(item => {
    const publisher = String(item?.publisher || '').trim();
    const group = String(item?.group || '').trim();
    const suppliedMentions = (Array.isArray(item?.mentions) ? item.mentions : [])
      .map(value => String(value || '').trim())
      .filter(Boolean);
    const legacyMention = String(item?.mention || '').trim();
    if (!suppliedMentions.length && legacyMention) suppliedMentions.push(legacyMention);
    let message = String(item?.message || '').trim();

    suppliedMentions.forEach(mention => {
      message = message.split(`@${mention}`).join('');
    });
    message = message
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/ +\n/g, '\n')
      .trim();

    const mentions = [];
    const mentionSearches = [];

    if (!publisher || !group || group === 'N/A' || !message) {
      throw new Error('Uno de los mensajes no tiene publisher, grupo o contenido válido.');
    }

    return { publisher, group, mentions, mentionSearches, message };
  });
};

const prepareDrafts = async (payload) => {
  const items = validateItems(payload);
  const cleanupOnly = payload.cleanupOnly === true;
  const page = await getWhatsAppPage();
  const results = [];

  for (const item of items) {
    results.push(await prepareOneDraft(page, { ...item, probeOnly: false, cleanupOnly }));
  }

  await page.bringToFront();
  return results;
};

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, mode: 'draft-only', port: PORT });
    return;
  }

  if (request.method === 'POST' && request.url === '/prepare') {
    if (activeRun) {
      sendJson(response, 409, { ok: false, error: 'Ya hay una preparación en curso.' });
      return;
    }

    activeRun = true;
    try {
      const payload = await readJsonBody(request);
      const results = await prepareDrafts(payload);
      sendJson(response, 200, { ok: true, results });
    } catch (error) {
      sendJson(response, 400, { ok: false, error: error.message });
    } finally {
      activeRun = false;
    }
    return;
  }

  sendJson(response, 404, { ok: false, error: 'Ruta no encontrada.' });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('==================================================');
  console.log('WHATSAPP DRAFT ASSISTANT');
  console.log('==================================================');
  console.log(`Escuchando en http://${HOST}:${PORT}`);
  console.log('Modo seguro: prepara borradores y nunca pulsa Send/Enter.');
  console.log('Deja esta ventana abierta mientras usas los botones del reporte.');
});

const shutdown = async () => {
  server.close();
  if (contextPromise) {
    const context = await contextPromise.catch(() => null);
    if (context) await context.close().catch(() => {});
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
