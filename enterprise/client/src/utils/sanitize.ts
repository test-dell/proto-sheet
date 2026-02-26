import DOMPurify from 'dompurify';

/**
 * Sanitize user input to prevent XSS attacks.
 */
export function sanitize(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize HTML content (allows safe tags).
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}
