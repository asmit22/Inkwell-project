// backend/utils.js
// ─────────────────────────────────────────────────────────
//  Helper functions for auth, validation, and sanitization.
// ─────────────────────────────────────────────────────────

const DOMPurify = require('isomorphic-dompurify');

/**
 * Validate email format
 */
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Validate password strength
 */
function isStrongPassword(pwd) {
  return pwd.length >= 8;
}

/**
 * Sanitize user input to prevent XSS
 */
function sanitizeInput(str) {
  if (!str) return '';
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/**
 * Sanitize HTML content (allows limited formatting)
 */
function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Extract file extension safely
 */
function getFileExtension(filename) {
  const parts = filename.split('.');
  if (parts.length < 2) return null;
  return parts[parts.length - 1].toLowerCase();
}

/**
 * Validate file type
 */
function isValidFileType(filename) {
  const ext = getFileExtension(filename);
  return ['txt', 'pdf', 'docx'].includes(ext);
}

/**
 * Generate a random ID
 */
function randomId(length = 12) {
  return Math.random().toString(36).substr(2, length);
}

/**
 * Rate limit helper (in-memory, for dev; use Redis in production)
 */
const rateLimitStore = new Map();

function checkRateLimit(key, maxRequests = 5, windowSeconds = 60) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowSeconds * 1000 };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowSeconds * 1000;
  }

  record.count++;
  rateLimitStore.set(key, record);

  return record.count <= maxRequests;
}

module.exports = {
  isValidEmail,
  isStrongPassword,
  sanitizeInput,
  sanitizeHTML,
  getFileExtension,
  isValidFileType,
  randomId,
  checkRateLimit,
};
