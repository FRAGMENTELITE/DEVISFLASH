// Vercel - /api/chorus
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Methode non autorisee' });
  const body = req.body || {};
  const errors = [];
  if (!body.siret || !/^\d{14}$/.test(String(body.siret).replace(/\s/g, ''))) errors.push('SIRET invalide (14 chiffres)');
  if (!body.numero) errors.push('Numero de facture manquant');
  if (!body.client?.nom) errors.push('Nom client manquant');
  if (!Array.isArray(body.lignes) || body.lignes.length === 0) errors.push('Au moins 1 ligne requise');
  if (!body.totalTTC || Number(body.totalTTC) <= 0) errors.push('Total TTC invalide');
  if (errors.length) return res.status(400).json({ error: 'Validation echouee', errors });
  return res.status(200).json({
    ok: true, mode: 'mock',
    message: 'Facture validee cote serveur. Emission electronique obligatoire au 1er septembre 2027 pour PME/TPE/Artisans. Reception obligatoire depuis le 1er septembre 2026.',
    facture: { numero: body.numero, totalTTC: body.totalTTC, client: body.client.nom },
  });
}
