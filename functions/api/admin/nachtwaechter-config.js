export async function onRequestGet(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const authHeader = request.headers.get('Authorization') || '';
  const password = authHeader.replace(/^Bearer\s+/i, '').trim();
  const envPass = (env.ADMIN_PASSWORD || env.APP_PASSWORD || env.PASSWORD || env.MASTER_PASSWORD || '').toString().trim();
  const clientPassword = (env.CLIENT_PASSWORD_NACHTWAECHTER || env.NACHTWAECHTER_PASSWORD || 'nienburg1025').toString().trim();

  const isMatch = (envPass && password === envPass) || (clientPassword && password === clientPassword);

  if (!isMatch) {
    return new Response(JSON.stringify({ success: false, message: 'Nicht autorisiert.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const isDraft = url.searchParams.get('draft') === 'true';
  const primaryKey = isDraft ? 'nachtwaechter_config_draft' : 'nachtwaechter_config';
  const fallbackKey = 'nachtwaechter_config';

  // 1. Direktes Cloudflare KV Binding
  if (env.KUNDEN_DB && typeof env.KUNDEN_DB.get === 'function') {
    try {
      let val = await env.KUNDEN_DB.get(primaryKey);
      if (!val && isDraft) {
        val = await env.KUNDEN_DB.get(fallbackKey);
      }
      if (val) {
        return new Response(JSON.stringify({ success: true, config: JSON.parse(val) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (e) {
      // Weiter zu REST API
    }
  }

  // 2. Cloudflare REST API Abruf
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || '73d6308cb7c5d11e8200bebfcd6e412e';
  const namespaceId = '8d2fe320c4134c368f28c18153d4f82d'; // KUNDEN_DB

  if (apiToken) {
    const kvUrl = (k) => `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${k}`;
    try {
      let kvResponse = await fetch(kvUrl(primaryKey), {
        headers: {
          'Authorization': `Bearer ${apiToken}`
        }
      });

      if (kvResponse.status !== 200 && isDraft) {
        kvResponse = await fetch(kvUrl(fallbackKey), {
          headers: {
            'Authorization': `Bearer ${apiToken}`
          }
        });
      }

      if (kvResponse.status === 200) {
        const configText = await kvResponse.text();
        return new Response(JSON.stringify({ success: true, config: JSON.parse(configText) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      // Weiter zu Fallback
    }
  }

  // 3. Sichere Fallback-Termine
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

  return new Response(JSON.stringify({ success: true, config: defaults }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  const authHeader = request.headers.get('Authorization') || '';
  const password = authHeader.replace(/^Bearer\s+/i, '').trim();
  const envPass = (env.ADMIN_PASSWORD || env.APP_PASSWORD || env.PASSWORD || env.MASTER_PASSWORD || '').toString().trim();
  const clientPassword = (env.CLIENT_PASSWORD_NACHTWAECHTER || env.NACHTWAECHTER_PASSWORD || 'nienburg1025').toString().trim();

  const isMatch = (envPass && password === envPass) || (clientPassword && password === clientPassword);

  if (!isMatch) {
    return new Response(JSON.stringify({ success: false, message: 'Nicht autorisiert.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { config } = await request.json();
    if (!config) {
      return new Response(JSON.stringify({ success: false, message: 'Keine Konfiguration übermittelt.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const isDraft = url.searchParams.get('draft') === 'true';
    const key = isDraft ? 'nachtwaechter_config_draft' : 'nachtwaechter_config';

    // 1. Direktes Cloudflare KV Binding nutzen falls vorhanden
    if (env.KUNDEN_DB && typeof env.KUNDEN_DB.put === 'function') {
      try {
        await env.KUNDEN_DB.put(key, JSON.stringify(config));
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        // Weiter zu REST API
      }
    }

    // 2. Cloudflare REST API
    const apiToken = env.CLOUDFLARE_API_TOKEN;
    const accountId = env.CLOUDFLARE_ACCOUNT_ID || '73d6308cb7c5d11e8200bebfcd6e412e';
    const namespaceId = '8d2fe320c4134c368f28c18153d4f82d'; // KUNDEN_DB

    if (!apiToken) {
      return new Response(JSON.stringify({ success: false, message: 'CLOUDFLARE_API_TOKEN fehlt in Cloudflare Pages Environment.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${key}`;

    const kvResponse = await fetch(kvUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(config)
    });

    if (kvResponse.ok) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      const errText = await kvResponse.text();
      return new Response(JSON.stringify({ success: false, message: 'Fehler beim Speichern in Cloudflare KV: ' + errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Verbindungsfehler: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
