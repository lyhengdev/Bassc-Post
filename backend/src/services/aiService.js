import OpenAI from 'openai';
import crypto from 'crypto';
import config from '../config/index.js';
import { AILog } from '../models/Analytics.js';

class AIService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.isOpenAIConfigured = false;
    this.isAzureTranslatorConfigured = false;
    this.azureTranslatorEndpoint = 'https://api.cognitive.microsofttranslator.com';
    this.azureTranslatorKey = '';
    this.azureTranslatorRegion = '';
    this.initialize();
  }

  initialize() {
    this.azureTranslatorEndpoint = String(
      config.azureTranslator?.endpoint || 'https://api.cognitive.microsofttranslator.com'
    ).replace(/\/+$/, '');
    this.azureTranslatorKey = config.azureTranslator?.key || '';
    this.azureTranslatorRegion = config.azureTranslator?.region || '';
    this.isAzureTranslatorConfigured = Boolean(this.azureTranslatorKey && this.azureTranslatorRegion);

    if (this.isAzureTranslatorConfigured) {
      console.log('✅ Azure Translator initialized');
    } else {
      console.warn('⚠️ Azure Translator not configured - article translation will use fallback provider');
    }

    if (!config.openai.apiKey) {
      console.warn('⚠️ OpenAI API key not configured - non-translation AI features will be mocked');
      this.isConfigured = false;
      this.isOpenAIConfigured = false;
      return;
    }

    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    this.isOpenAIConfigured = true;
    this.isConfigured = true;
    console.log('✅ OpenAI AI service initialized');
  }

  async logUsage(userId, action, data) {
    try {
      await AILog.create({
        user: userId,
        action,
        ...data,
      });
    } catch (e) {
      console.error('Error logging AI usage:', e.message);
    }
  }

  async grammarCheck(text, userId) {
    const startTime = Date.now();

    try {
      if (!this.isConfigured) {
        return {
          success: true,
          original: text,
          corrected: text,
          corrections: [],
          message: 'AI not configured - returning original text',
        };
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional editor. Check the following text for grammar, spelling, and punctuation errors. Return a JSON response with:
- "corrected": the corrected text
- "corrections": array of objects with "original", "corrected", and "explanation" for each correction
Only include corrections if there are actual errors. If the text is correct, return the original text.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'grammar-check', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        original: text,
        corrected: result.corrected,
        corrections: result.corrections || [],
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'grammar-check', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });

      throw error;
    }
  }

  async generateHeadlines(content, options = {}, userId) {
    const startTime = Date.now();
    const { count = 5, style = 'news' } = options;

    try {
      if (!this.isConfigured) {
        return {
          success: true,
          headlines: [
            'Sample Headline 1',
            'Sample Headline 2',
            'Sample Headline 3',
          ],
          message: 'AI not configured - returning sample headlines',
        };
      }

      const styleGuides = {
        news: 'Clear, factual, and informative news headlines',
        engaging: 'Engaging and attention-grabbing headlines that create curiosity',
        seo: 'SEO-optimized headlines with relevant keywords',
        social: 'Social media friendly headlines that encourage sharing',
      };

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional headline writer. Generate ${count} unique headlines for the given content. Style: ${styleGuides[style] || styleGuides.news}. Return a JSON response with:
- "headlines": array of headline strings
Each headline should be concise (under 80 characters), compelling, and accurate to the content.`,
          },
          {
            role: 'user',
            content: content.substring(0, 2000), // Limit content length
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'headline-generator', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        headlines: result.headlines,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'headline-generator', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });

      throw error;
    }
  }

  async generateSummary(content, options = {}, userId) {
    const startTime = Date.now();
    const { length = 'medium', style = 'neutral' } = options;

    try {
      if (!this.isConfigured) {
        return {
          success: true,
          summary: content.substring(0, 200) + '...',
          message: 'AI not configured - returning truncated content',
        };
      }

      const lengthGuides = {
        short: '1-2 sentences (about 50 words)',
        medium: '3-4 sentences (about 100 words)',
        long: '5-6 sentences (about 150 words)',
      };

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional summarizer. Create a ${lengthGuides[length] || lengthGuides.medium} summary of the given content. Return a JSON response with:
- "summary": the summary text
- "keyPoints": array of 3-5 key points from the content
Be accurate and maintain the original tone.`,
          },
          {
            role: 'user',
            content: content.substring(0, 4000),
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'summary', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        summary: result.summary,
        keyPoints: result.keyPoints || [],
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'summary', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });

      throw error;
    }
  }

  async analyzeSentiment(content, userId) {
    const startTime = Date.now();

    try {
      if (!this.isConfigured) {
        return {
          success: true,
          sentiment: 'neutral',
          score: 0,
          analysis: 'AI not configured - returning neutral sentiment',
        };
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze the sentiment of the following text. Return a JSON response with:
- "sentiment": one of "positive", "negative", "neutral", or "mixed"
- "score": a number from -1 (very negative) to 1 (very positive)
- "analysis": brief explanation of the sentiment
- "emotions": array of detected emotions (e.g., "joy", "anger", "fear", "surprise", "sadness")`,
          },
          {
            role: 'user',
            content: content.substring(0, 2000),
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'sentiment-analysis', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        sentiment: result.sentiment,
        score: result.score,
        analysis: result.analysis,
        emotions: result.emotions || [],
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'sentiment-analysis', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });

      throw error;
    }
  }

  async improveWriting(content, options = {}, userId) {
    const startTime = Date.now();
    const { style = 'professional', focus = 'clarity' } = options;

    try {
      if (!this.isConfigured) {
        return {
          success: true,
          improved: content,
          suggestions: [],
          message: 'AI not configured - returning original content',
        };
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional writing coach. Improve the following text with a focus on ${focus}. Style: ${style}. Return a JSON response with:
- "improved": the improved text
- "suggestions": array of specific suggestions with "original", "improved", and "reason"
- "readabilityScore": estimated readability score (1-10)
Maintain the original meaning and voice.`,
          },
          {
            role: 'user',
            content: content.substring(0, 3000),
          },
        ],
        temperature: 0.6,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content);
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'writing-improvement', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        improved: result.improved,
        suggestions: result.suggestions || [],
        readabilityScore: result.readabilityScore,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await this.logUsage(userId, 'writing-improvement', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });

      throw error;
    }
  }

  async translateTextsWithAzure(texts = [], options = {}, userId) {
    const startTime = Date.now();
    const { sourceLanguage = 'en', targetLanguage = 'km' } = options;
    const fromLanguage = String(sourceLanguage || '').trim().toLowerCase();
    const toLanguage = String(targetLanguage || 'km').trim().toLowerCase() || 'km';

    try {
      if (!this.isAzureTranslatorConfigured) {
        throw new Error('Azure Translator is not configured');
      }

      const chunks = [];
      let currentChunk = [];
      let currentChunkChars = 0;
      const maxItemsPerChunk = 100;
      const maxCharsPerChunk = 45000;

      texts.forEach((text) => {
        const value = typeof text === 'string' ? text : String(text ?? '');
        const valueLength = value.length;
        const exceedsChunk = currentChunk.length >= maxItemsPerChunk
          || (currentChunk.length > 0 && (currentChunkChars + valueLength) > maxCharsPerChunk);

        if (exceedsChunk) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentChunkChars = 0;
        }

        currentChunk.push(value);
        currentChunkChars += valueLength;
      });

      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }

      const translatedTexts = [];

      for (const chunk of chunks) {
        const params = new URLSearchParams({ 'api-version': '3.0', to: toLanguage });
        if (fromLanguage) {
          params.set('from', fromLanguage);
        }

        const response = await fetch(`${this.azureTranslatorEndpoint}/translate?${params.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': this.azureTranslatorKey,
            'Ocp-Apim-Subscription-Region': this.azureTranslatorRegion,
            'X-ClientTraceId': crypto.randomUUID(),
          },
          body: JSON.stringify(chunk.map((text) => ({ Text: text }))),
        });

        if (!response.ok) {
          let detail = '';
          try {
            const payload = await response.json();
            detail = payload?.error?.message || payload?.message || '';
          } catch {
            detail = '';
          }
          throw new Error(
            detail
              ? `Azure Translator request failed (${response.status}): ${detail}`
              : `Azure Translator request failed (${response.status})`
          );
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error('Azure Translator response format is invalid');
        }

        payload.forEach((item, index) => {
          const translatedText = item?.translations?.[0]?.text;
          translatedTexts.push(typeof translatedText === 'string' ? translatedText : chunk[index]);
        });
      }

      const responseTime = Date.now() - startTime;
      await this.logUsage(userId, 'translation-azure', {
        model: 'azure-translator-v3',
        success: true,
        responseTime,
        inputCharacters: texts.reduce((sum, text) => sum + String(text || '').length, 0),
        outputCharacters: translatedTexts.reduce((sum, text) => sum + String(text || '').length, 0),
      });

      return {
        success: true,
        translations: translatedTexts,
        provider: 'azure',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logUsage(userId, 'translation-azure', {
        model: 'azure-translator-v3',
        success: false,
        responseTime,
        errorMessage: error.message,
      });
      throw error;
    }
  }

  async translateTexts(texts = [], options = {}, userId) {
    const startTime = Date.now();
    const { sourceLanguage = 'en', targetLanguage = 'km' } = options;
    const normalizedTexts = Array.isArray(texts)
      ? texts.map((text) => (typeof text === 'string' ? text : String(text ?? '')))
      : [];
    const normalizedSourceLanguage = String(sourceLanguage || '').trim().toLowerCase();
    const normalizedTargetLanguage = String(targetLanguage || 'km').trim().toLowerCase() || 'km';

    try {
      if (normalizedTexts.length === 0) {
        return {
          success: true,
          translations: [],
        };
      }

      if (normalizedSourceLanguage && normalizedSourceLanguage === normalizedTargetLanguage) {
        return {
          success: true,
          translations: normalizedTexts,
          message: 'Source and target languages are the same',
        };
      }

      if (this.isAzureTranslatorConfigured) {
        try {
          return await this.translateTextsWithAzure(
            normalizedTexts,
            { sourceLanguage: normalizedSourceLanguage, targetLanguage: normalizedTargetLanguage },
            userId
          );
        } catch (azureError) {
          if (!this.isConfigured) {
            throw azureError;
          }
          console.warn(`Azure translation failed, falling back to OpenAI: ${azureError.message}`);
        }
      }

      if (!this.isConfigured) {
        return {
          success: true,
          translations: normalizedTexts,
          message: 'No translation provider configured - returning original text',
        };
      }

      const response = await this.client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator.
Translate each input string from ${normalizedSourceLanguage || sourceLanguage} to ${normalizedTargetLanguage || targetLanguage}.
Rules:
- Keep the same array length and order.
- Do not add, remove, merge, or split entries.
- Keep URLs, HTML tags, and placeholders unchanged.
- Preserve punctuation and formatting as much as possible.
Return valid JSON:
{
  "translations": ["...", "..."]
}`,
          },
          {
            role: 'user',
            content: JSON.stringify({ texts: normalizedTexts }),
          },
        ],
        temperature: 0.2,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      const translated = Array.isArray(result.translations) ? result.translations : [];
      const translations = normalizedTexts.map((text, index) => {
        const candidate = translated[index];
        return typeof candidate === 'string' && candidate.trim() ? candidate : text;
      });

      const responseTime = Date.now() - startTime;
      await this.logUsage(userId, 'translation', {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
        model: 'gpt-3.5-turbo',
        success: true,
        responseTime,
      });

      return {
        success: true,
        translations,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await this.logUsage(userId, 'translation', {
        success: false,
        errorMessage: error.message,
        responseTime,
      });
      throw error;
    }
  }
}

export default new AIService();
