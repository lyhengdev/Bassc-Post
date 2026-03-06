import config from '../config/index.js';

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const DEFAULT_TIMEOUT_MS = 8000;

const sanitizeLineValue = (value = '') =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, '/')
    .trim();

const escapeHtml = (value = '') =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeTelegramHref = (value = '') => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return encodeURI(raw).replace(/"/g, '%22').replace(/'/g, '%27');
};

class TelegramService {
  constructor() {
    this.timeoutMs = DEFAULT_TIMEOUT_MS;
  }

  isEnabled() {
    return Boolean(config.telegram?.enabled && config.telegram?.botToken);
  }

  getApiUrl(method = 'sendMessage') {
    const token = config.telegram?.botToken || '';
    return `https://api.telegram.org/bot${token}/${method}`;
  }

  normalizeText(text = '') {
    const message = String(text || '').trim();
    if (!message) return '';
    if (message.length <= TELEGRAM_MAX_MESSAGE_LENGTH) return message;
    return `${message.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH - 3)}...`;
  }

  getChatIdsByRole(role = '') {
    const normalizedRole = String(role || '').trim().toLowerCase();
    const chatIds = config.telegram?.chatIds?.[normalizedRole];
    return Array.isArray(chatIds) ? chatIds : [];
  }

  buildWorkflowMessage({
    stage = '',
    articleId = '',
    title = '',
    language = '',
    submittedBy = '',
    dueAt = '',
    link = '',
  } = {}) {
    const safeStage = escapeHtml(sanitizeLineValue((stage || 'WORKFLOW').toUpperCase()));
    const safeId = escapeHtml(sanitizeLineValue(articleId || '-'));
    const safeTitle = escapeHtml(sanitizeLineValue(title || 'Untitled'));
    const safeLanguage = escapeHtml(sanitizeLineValue((language || '-').toUpperCase() || '-'));
    const safeBy = escapeHtml(sanitizeLineValue(submittedBy || '-'));
    const safeDue = escapeHtml(sanitizeLineValue(dueAt || '-'));
    const safeLinkHref = normalizeTelegramHref(link);
    const linkPart = safeLinkHref ? 'Open in CMS' : '-';

    return this.normalizeText(
      `[${safeStage}] #${safeId} | ${safeTitle} | ${safeLanguage} | by ${safeBy} | ${safeDue} | ${linkPart}`
    );
  }

  async sendMessage({
    chatId,
    text,
    parseMode = null,
    disableWebPagePreview = true,
    silent = false,
    replyMarkup = null,
  } = {}) {
    const normalizedText = this.normalizeText(text);
    const normalizedChatId = String(chatId || '').trim();

    if (!normalizedChatId) {
      return { ok: false, skipped: true, reason: 'missing_chat_id' };
    }

    if (!normalizedText) {
      return { ok: false, skipped: true, reason: 'empty_text' };
    }

    if (!this.isEnabled()) {
      return { ok: false, skipped: true, reason: 'telegram_disabled' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const requestPayload = {
        chat_id: normalizedChatId,
        text: normalizedText,
        disable_web_page_preview: disableWebPagePreview,
        disable_notification: silent,
      };

      if (parseMode) {
        requestPayload.parse_mode = parseMode;
      }
      if (replyMarkup && typeof replyMarkup === 'object') {
        requestPayload.reply_markup = replyMarkup;
      }

      const response = await fetch(this.getApiUrl('sendMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify(requestPayload),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.ok) {
        console.warn('Telegram sendMessage failed', {
          status: response.status,
          chatId: normalizedChatId,
          description: payload?.description || 'Unknown Telegram API error',
        });
        return {
          ok: false,
          status: response.status,
          description: payload?.description || 'Unknown Telegram API error',
        };
      }

      return { ok: true, result: payload.result };
    } catch (error) {
      console.warn('Telegram sendMessage error', {
        chatId: normalizedChatId,
        error: error?.message || 'Unknown error',
      });
      return { ok: false, error: error?.message || 'Unknown error' };
    } finally {
      clearTimeout(timeout);
    }
  }

  sendMessageNonBlocking(payload = {}) {
    void this.sendMessage(payload).catch(() => {});
  }

  async sendToChatGroup(chatIds = [], text = '', options = {}) {
    const ids = Array.isArray(chatIds) ? chatIds.filter(Boolean) : [];
    if (!ids.length) {
      return [];
    }

    const results = await Promise.allSettled(
      ids.map((chatId) => this.sendMessage({ chatId, text, ...options }))
    );

    return results.map((result) =>
      result.status === 'fulfilled' ? result.value : { ok: false, error: result.reason?.message || 'Unknown error' }
    );
  }

  sendToChatGroupNonBlocking(chatIds = [], text = '', options = {}) {
    void this.sendToChatGroup(chatIds, text, options).catch(() => {});
  }

  async sendToRole(role = '', text = '', options = {}) {
    const chatIds = this.getChatIdsByRole(role);
    return this.sendToChatGroup(chatIds, text, options);
  }

  sendToRoleNonBlocking(role = '', text = '', options = {}) {
    const chatIds = this.getChatIdsByRole(role);
    this.sendToChatGroupNonBlocking(chatIds, text, options);
  }

  sendWorkflowUpdateNonBlocking({
    targetRole = '',
    stage = '',
    articleId = '',
    title = '',
    language = '',
    submittedBy = '',
    dueAt = '',
    link = '',
  } = {}) {
    const normalizedLink = normalizeTelegramHref(link);
    const message = this.buildWorkflowMessage({
      stage,
      articleId,
      title,
      language,
      submittedBy,
      dueAt,
      link: normalizedLink,
    });
    const replyMarkup = normalizedLink
      ? {
          inline_keyboard: [[{ text: 'Open in CMS', url: normalizedLink }]],
        }
      : null;
    this.sendToRoleNonBlocking(targetRole, message, {
      parseMode: null,
      disableWebPagePreview: true,
      replyMarkup,
    });
  }
}

const telegramService = new TelegramService();
export default telegramService;
