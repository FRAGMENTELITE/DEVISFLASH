// Vercel - /api/drive-backup - FICHIER 3/3 - A METTRE DANS api/drive-backup.js SEULEMENT
// Vercel - /api/drive-backup - VRAIE sauvegarde Google Drive
// POST -> sauvegarde, GET -> restauration
// Le front envoie Authorization: Bearer <token Google de l'utilisateur>
// Vercel ne stocke JAMAIS le token.

const BACKUP_FILENAME = 'Devis-Flash-Backup.json';
const BACKUP_FOLDER = 'Devis-Flash-Backup';

function cors(req, res) {
  const allowed = process.env.ALLOWED_ORIGIN || 'https://www.devis-flash.fr';
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin === allowed ? origin : allowed);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function getToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function driveFetch(token, url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

async function findFolderId(token, folderName) {
  const q = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const { ok, data } = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`);
  if (!ok) throw new Error(data?.error?.message || 'Erreur recherche dossier Drive');
  if (data.files && data.files.length > 0) return data.files[0].id;
  const created = await driveFetch(token, 'https://www.googleapis.com/drive/v3/files', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  if (!created.ok) throw new Error(created.data?.error?.message || 'Erreur creation dossier Drive');
  return created.data.id;
}

async function findFileId(token, fileName, folderId) {
  const q = encodeURIComponent(`name = '${fileName}' and trashed = false` + (folderId ? ` and '${folderId}' in parents` : ''));
  const { ok, data } = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`);
  if (!ok) throw new Error(data?.error?.message || 'Erreur recherche fichier Drive');
  return data.files && data.files.length > 0 ? data.files[0] : null;
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'Token Google manquant. Reconnecte Google Drive.' });

  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.data) return res.status(400).json({ error: 'Champ data manquant' });
      const payload = { ...body.data, _backupAt: new Date().toISOString(), _app: 'Devis Flash', _version: 'v2-vercel' };
      const jsonStr = JSON.stringify(payload, null, 2);
      const folderId = await findFolderId(token, BACKUP_FOLDER).catch(() => null);
      const existing = folderId ? await findFileId(token, BACKUP_FILENAME, folderId) : null;
      const boundary = '-------devisflash-' + Math.random().toString(36).slice(2);
      const metadata = { name: BACKUP_FILENAME, mimeType: 'application/json', ...(folderId ? { parents: [folderId] } : {}) };
      const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${jsonStr}\r\n--${boundary}--`;
      let result;
      if (existing) {
        result = await driveFetch(token, `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`, {
          method: 'PATCH', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
        });
      } else {
        result = await driveFetch(token, 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipart,
        });
      }
      if (!result.ok) {
        if (result.status === 401) return res.status(401).json({ error: 'Token Google expire. Reconnecte Google Drive.', code: 'TOKEN_EXPIRED' });
        return res.status(502).json({ error: 'Echec upload Drive', detail: result.data?.error?.message || result.data });
      }
      return res.status(200).json({ ok: true, fileId: result.data.id, fileName: BACKUP_FILENAME, folder: BACKUP_FOLDER, backupAt: payload._backupAt, updated: !!existing });
    }

    if (req.method === 'GET') {
      const folderId = await findFolderId(token, BACKUP_FOLDER).catch(() => null);
      const file = folderId ? await findFileId(token, BACKUP_FILENAME, folderId) : null;
      if (!file) return res.status(404).json({ error: 'Aucune sauvegarde trouvee sur Drive', code: 'NO_BACKUP' });
      const r = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        if (r.status === 401) return res.status(401).json({ error: 'Token Google expire', code: 'TOKEN_EXPIRED' });
        return res.status(502).json({ error: 'Echec telechargement Drive' });
      }
      const data = await r.json();
      return res.status(200).json({ ok: true, fileId: file.id, modifiedTime: file.modifiedTime, data });
    }

    return res.status(405).json({ error: 'Methode non autorisee' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: String(e?.message || e) });
  }
}
