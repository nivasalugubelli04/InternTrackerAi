import * as cheerio from 'cheerio';

/**
 * Sanitizes an HTML string to prevent XSS attacks by removing dangerous tags and attributes.
 * This is a basic sanitizer utilizing cheerio.
 * For a highly robust implementation, consider using `isomorphic-dompurify` or `xss`.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return html;

  const $ = cheerio.load(html); // Do not wrap with html/body

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
  ];
  $(dangerousTags.join(',')).remove();

  // 2. Remove all 'on*' event handler attributes (e.g., onclick, onerror) and javascript: hrefs
  $('*').each((_, element) => {
    if (element.type === 'tag') {
      const attribs = element.attribs;
      for (const attrName in attribs) {
        // Remove event handlers
        if (attrName.toLowerCase().startsWith('on')) {
          $(element).removeAttr(attrName);
        }

        // Remove javascript: and data: URIs in href and src
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
