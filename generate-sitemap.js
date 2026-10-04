const fs = require('fs');
const path = require('path');

const BASE = 'https://www.devis-flash.fr';
const ROOT = '.';

function getHtmlFiles(dir, base = '') {
  let urls = [];
  try {
    for (const file of fs.readdirSync(dir)) {
      if (file.startsWith('.') || file === 'node_modules' || file === '.github') continue;
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      const rel = path.join(base, file);
      if (stat.isDirectory()) {
        urls.push(...getHtmlFiles(full, rel));
      } else if (file.endsWith('.html')) {
        let url = '/' + rel.replace(/\\/g, '/');
        if (file === 'index.html') {
          url = '/' + base.replace(/\\/g, '/') + '/';
          url = url.replace(/\/\//g, '/');
        } else {
          url = '/' + rel.replace(/\\/g, '/').replace(/\.html$/, '/');
        }
        if (url === '//') url = '/';
        urls.push(url);
      }
    }
  } catch {}
  return urls;
}

const files = [...new Set(getHtmlFiles(ROOT))].sort();
const today = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
for (const u of files) {
  if (u.includes('404') || u.toLowerCase().includes('sitemap')) continue;
  let priority = '0.8';
  if (u === '/') priority = '1.0';
  if (u === '/presentation/') priority = '0.9';
  xml += `  <url>\n    <loc>${BASE}${u}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}
xml += `</urlset>\n`;

fs.writeFileSync('sitemap.xml', xml, 'utf-8');
console.log(`✅ Sitemap généré: ${files.length} URLs -> sitemap.xml`);
