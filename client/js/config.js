// Small config helper - reads meta tag set in index.html
const m = document.querySelector('meta[name="api-base-url"]');
if (!m || !m.content) {
  throw new Error('Missing required <meta name="api-base-url"> in index.html');
}
export const API_BASE = m.content.replace(/\/$/, '');
