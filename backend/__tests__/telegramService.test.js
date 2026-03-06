import { jest } from '@jest/globals';

const mockConfig = {
  telegram: {
    enabled: true,
    botToken: 'mock-bot-token',
    chatIds: {
      editor: ['1001'],
      translator: ['1002'],
      admin: ['1003'],
    },
  },
};

jest.unstable_mockModule('../src/config/index.js', () => ({
  default: mockConfig,
}));

let telegramService;

beforeAll(async () => {
  ({ default: telegramService } = await import('../src/services/telegramService.js'));
});

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = jest.fn();
});

describe('telegram service', () => {
  it('builds workflow messages using the expected one-line format', () => {
    const message = telegramService.buildWorkflowMessage({
      stage: 'SOURCE SUBMITTED',
      articleId: '42',
      title: 'Morning Brief',
      language: 'en',
      submittedBy: 'Writer A',
      dueAt: '2026-03-06',
      link: 'https://example.com/a/42',
    });

    expect(message).toBe(
      '[SOURCE SUBMITTED] #42 | Morning Brief | EN | by Writer A | 2026-03-06 | Open in CMS'
    );
  });

  it('sends message through Telegram API when enabled', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, result: { message_id: 99 } }),
    });

    const result = await telegramService.sendMessage({
      chatId: '1001',
      text: 'hello',
    });

    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sendMessage'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('does not call API when Telegram is disabled', async () => {
    mockConfig.telegram.enabled = false;

    const result = await telegramService.sendMessage({
      chatId: '1001',
      text: 'hello',
    });

    expect(result).toEqual(expect.objectContaining({ ok: false, skipped: true, reason: 'telegram_disabled' }));
    expect(global.fetch).not.toHaveBeenCalled();

    mockConfig.telegram.enabled = true;
  });

  it('routes workflow update to role chat without throwing', () => {
    const roleSpy = jest.spyOn(telegramService, 'sendToRoleNonBlocking').mockImplementation(() => {});

    telegramService.sendWorkflowUpdateNonBlocking({
      targetRole: 'editor',
      stage: 'SOURCE SUBMITTED',
      articleId: '100',
      title: 'Breaking Story',
      language: 'en',
      submittedBy: 'Writer X',
      dueAt: '',
      link: 'https://example.com/story/100',
    });

    expect(roleSpy).toHaveBeenCalledTimes(1);
    expect(roleSpy).toHaveBeenCalledWith(
      'editor',
      expect.stringContaining('[SOURCE SUBMITTED] #100 | Breaking Story | EN | by Writer X | - | Open in CMS'),
      expect.objectContaining({
        parseMode: null,
        disableWebPagePreview: true,
        replyMarkup: {
          inline_keyboard: [[{ text: 'Open in CMS', url: 'https://example.com/story/100' }]],
        },
      })
    );
  });
});
