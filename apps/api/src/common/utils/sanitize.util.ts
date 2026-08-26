/* eslint-disable no-control-regex */
import * as cheerio from 'cheerio';

/**
 * Sanitizes an HTML string to prevent XSS attacks by removing dangerous tags and attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  const $ = cheerio.load(html);

  // 1. Remove dangerous tags completely
  const dangerousTags = [
    'script',
    'iframe',
    'object',
    'embed',
    'style',
    'link',
    'meta',
    'applet',
    'noframes',
    'noscript',
    'base',
    'form',
  ];
  $(dangerousTags.join(',')).remove();

  // 2. Remove all 'on*' event handler attributes and javascript/data URIs
  $('*').each((_, element) => {
    if (element.type === 'tag') {
      const attribs = element.attribs;
      for (const attrName in attribs) {
        if (attrName.toLowerCase().startsWith('on')) {
          $(element).removeAttr(attrName);
        }

        if (attrName.toLowerCase() === 'href' || attrName.toLowerCase() === 'src') {
          const attrValue = attribs[attrName]?.trim().toLowerCase() || '';
          if (
            attrValue.startsWith('javascript:') ||
            attrValue.startsWith('vbscript:') ||
            attrValue.startsWith('data:text/html')
          ) {
            $(element).removeAttr(attrName);
          }
        }
      }
    }
  });

  return $.html();
}

/**
 * Defends against prompt injection, delimiter breakout, and invisible character attacks.
 */
export function sanitizePromptInput(input: string, maxLen = 4000): string {
  if (!input || typeof input !== 'string') return '';

  // 1. Truncate to maximum safe length to prevent token-exhaustion denial of service
  let cleaned = input.slice(0, maxLen);

  // 2. Strip zero-width, non-printable, and unicode direction override characters
  const controlCharsPattern = new RegExp(
    '[\\u200B-\\u200D\\uFEFF\\u202A-\\u202E\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]',
    'g',
  );
  cleaned = cleaned.replace(controlCharsPattern, '');

  // 3. Neutralize explicit LLM conversation boundary injection delimiters
  const injectionPatterns = [
    /\[INST\]/gi,
    /\[\/INST\]/gi,
    /<\|im_start\|>/gi,
    /<\|im_end\|>/gi,
    /<\|endoftext\|>/gi,
    /```system/gi,
    /```assistant/gi,
    /\bSYSTEM:\s*/gi,
    /\bHuman:\s*/gi,
    /\bAssistant:\s*/gi,
  ];

  for (const pattern of injectionPatterns) {
    cleaned = cleaned.replace(pattern, '[filtered]');
  }

  return cleaned.trim();
}

/**
 * Sanitizes structured or text output from AI to ensure no dangerous payloads are reflected.
 */
export function sanitizeAiOutput(output: string): string {
  if (!output || typeof output !== 'string') return '';
  return sanitizeHtml(output).trim();
}
