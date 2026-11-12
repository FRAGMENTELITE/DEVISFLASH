// Vercel - /api/health
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({ ok: true, version: 'v2-vercel', message: 'API Devis Flash sur Vercel OK' });
}
