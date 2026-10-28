// Paths and constants shared by the server modules.

const path = require('path');

const SITE_ROOT = path.join(__dirname, '..');
// Content volume in Docker (./content)
const CONTENT_DIR = path.join(SITE_ROOT, 'content');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
};

module.exports = { SITE_ROOT, CONTENT_DIR, MIME };
