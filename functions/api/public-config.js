export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 1. Stefan Hilkers aktuelle Live-Termine als sicherer Fallback
  const defaults = {
    "blockedDates": [
      "2026-07-18","2026-07-20","2026-07-21","2026-07-22","2026-07-23","2026-07-24",
      "2026-07-25","2026-07-28","2026-08-01","2026-08-03","2026-08-11","2026-08-17",
      "2026-08-21","2026-08-22","2026-08-23","2026-08-29","2026-08-31","2026-09-06",
      "2026-09-11","2026-09-12","2026-09-13","2026-09-20","2026-09-22","2026-09-26",
      "2026-09-27","2026-09-29","2026-09-30","2026-10-01","2026-10-02","2026-10-03",
      "2026-10-04","2026-10-05","2026-10-06","2026-10-07","2026-10-08","2026-10-09",
      "2026-10-10","2026-10-11","2026-10-24","2026-10-26","2026-11-01","2026-11-07",
      "2026-11-14","2026-11-15","2026-11-29","2026-12-05","2026-12-18","2026-12-24",
      "2026-12-25","2026-12-27","2026-12-31"
    ],
    "publicTourOverrides": {}
  };

  // 2. Direktes Binding an Cloudflare KV (falls eingerichtet)
  if (env.KUNDEN_DB && typeof env.KUNDEN_DB.get === 'function') {
    try {
      const val = await env.KUNDEN_DB.get('nachtwaechter_config');
      if (val) {
        return new Response(val, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // Weiter zu REST API
    }
  }

  // 3. Cloudflare REST API Abruf
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || '73d6308cb7c5d11e8200bebfcd6e412e';
  const namespaceId = '8d2fe320c4134c368f28c18153d4f82d'; // KUNDEN_DB
  const key = 'nachtwaechter_config';

  if (apiToken) {
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;
    try {
      const kvResponse = await fetch(kvUrl, {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (kvResponse.status === 200) {
        const configText = await kvResponse.text();
        return new Response(configText, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      // Weiter zu Fallback
    }
  }

  // 4. Absoluter Fallback: Immer die echten Termine liefern
  return new Response(JSON.stringify(defaults), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function onRequestOptions(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
