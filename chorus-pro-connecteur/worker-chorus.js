// worker-chorus.js - Déploie sur Cloudflare Workers (gratuit)
// Secrets: PISTE_CLIENT, PISTE_SECRET
export default {
  async fetch(request, env) {
    if(request.method === 'OPTIONS'){
      return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'*'}});
    }
    try{
      const formData = await request.formData();
      const file = formData.get('facturx');
      const siret = formData.get('siret') || '10484045900010';
      if(!file) return new Response(JSON.stringify({error:'No file'}),{status:400, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
      const authRes = await fetch('https://api-piste.apitest.chorus-pro.gouv.fr/api/oauth/token', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(env.PISTE_CLIENT)}&client_secret=${encodeURIComponent(env.PISTE_SECRET)}&scope=openid`
      });
      const auth = await authRes.json();
      if(!auth.access_token) throw new Error('PISTE auth failed: '+JSON.stringify(auth));
      const chorusFD = new FormData();
      chorusFD.append('fichier', file, 'facture.pdf');
      chorusFD.append('siretFournisseur', siret);
      const depot = await fetch('https://api-apitest.chorus-pro.gouv.fr/cpro/factures/v1/deposer/flux', {
        method:'POST',
        headers:{'Authorization': `Bearer ${auth.access_token}`, 'cProAction': 'DEPOSER_FACTURE_PDF'},
        body: chorusFD
      });
      const result = await depot.text();
      return new Response(result, {headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }catch(e){
      return new Response(JSON.stringify({error:e.message}),{status:500, headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'}});
    }
  }
}
