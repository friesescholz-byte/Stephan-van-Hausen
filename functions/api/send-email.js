export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const data = await request.json();
    const { turnstileToken } = data;

    // 1. Turnstile Token prüfen
    if (!turnstileToken) {
      return new Response(JSON.stringify({ success: false, message: 'Spam-Schutz fehlt.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const turnstileSecret = env.CLOUDFLARE_TURNSTILE_SECRET_KEY_STEPHAN_VAN_HAUSEN || 
                            env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

    if (turnstileSecret) {
      const verifyResult = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${turnstileSecret}&response=${turnstileToken}`,
      });
      const verifyData = await verifyResult.json();

      if (!verifyData.success) {
        return new Response(JSON.stringify({ success: false, message: 'Spam-Schutz (Turnstile) fehlgeschlagen.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Eingaben validieren
    const { name, email, phone, date, time, tourType, groupSize, gewandZuschlag, cost, message, isPublic } = data;

    if (!name || !email || !date) {
      return new Response(JSON.stringify({ success: false, message: 'Name, E-Mail und Wunschtermin sind Pflichtfelder.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendApiKey = env.RESEND_API_KEY;
    if (!resendApiKey) {
      return new Response(JSON.stringify({ success: false, message: 'Server-Konfigurationsfehler: E-Mail-Dienst nicht konfiguriert.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const recipientEmail = 'info@nienburger-nachtwaechter.de';

    // Helper zur Signaturerzeugung
    async function generateSignature(secret, dataStr) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      const dataData = encoder.encode(dataStr);
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataData);
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    const secretKey = env.SIGNATURE_SECRET || resendApiKey;
    const tokenDataAccept = `accept|${email}|${date}|${time || ''}|${cost}`;
    const tokenDataReject = `reject|${email}|${date}|${time || ''}|${cost}`;
    
    const sigAccept = await generateSignature(secretKey, tokenDataAccept);
    const sigReject = await generateSignature(secretKey, tokenDataReject);
    
    const baseActionUrl = 'https://nienburger-nachtwaechter.de/api/respond-booking';
    const acceptLink = `${baseActionUrl}?action=accept&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time || '')}&tourType=${encodeURIComponent(tourType)}&cost=${cost}&phone=${encodeURIComponent(phone || '')}&groupSize=${encodeURIComponent(groupSize || '')}&sig=${sigAccept}`;
    const rejectLink = `${baseActionUrl}?action=reject&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time || '')}&tourType=${encodeURIComponent(tourType)}&cost=${cost}&phone=${encodeURIComponent(phone || '')}&groupSize=${encodeURIComponent(groupSize || '')}&sig=${sigReject}`;

    if (isPublic) {
      // --- Öffentliche Führung: Admin Benachrichtigung ---
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html lang="de">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background-color: #07090d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #07090d; padding: 40px 10px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #131722; border: 1px solid rgba(217, 162, 74, 0.15); overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);">
                  <tr>
                    <td style="background-color: #0d111a; padding: 35px 30px; text-align: center; border-bottom: 2px solid #d9a24a;">
                      <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 0.08em; color: #faf6ee; text-transform: uppercase; font-weight: 400;">Stephan van Hausen</h1>
                      <p style="margin: 6px 0 0 0; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #d9a24a; font-weight: 500;">Nachtwächter-Führungen Nienburg</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 45px 35px;">
                      <p style="font-family: Georgia, serif; font-size: 20px; color: #faf6ee; margin: 0 0 15px 0; font-style: italic;">Hallo Stephan,</p>
                      <p style="color: #94a3b8; font-size: 14.5px; line-height: 1.65; margin: 0 0 30px 0;">
                        eine neue Anmeldung zur <strong>öffentlichen Führung</strong> wurde übermittelt:
                      </p>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 35px; border-collapse: collapse; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; width: 38%; font-size: 11px; text-transform: uppercase;">Kunde</td><td style="padding: 12px 16px; color: #faf6ee;">${name}</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">E-Mail</td><td style="padding: 12px 16px; color: #faf6ee;"><a href="mailto:${email}" style="color: #d9a24a; text-decoration: none;">${email}</a></td></tr>
                        ${phone ? `<tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Telefon</td><td style="padding: 12px 16px; color: #faf6ee;">${phone}</td></tr>` : ''}
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Wunschtermin</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">${date}</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Uhrzeit</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">18:00 Uhr</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Treffpunkt</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">Lange Straße, Höhe Cup&amp;Cino</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Führungstyp</td><td style="padding: 12px 16px; color: #faf6ee;">${tourType}</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Teilnehmer</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">${groupSize} Personen</td></tr>
                        <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Preis gesamt</td><td style="padding: 12px 16px; color: #d9a24a; font-weight: bold; font-size: 16px;">${cost},00 € (Bar vor Ort)</td></tr>
                      </table>

                      ${message ? `
                      <div style="background-color: rgba(217, 162, 74, 0.04); border-left: 3px solid #d9a24a; padding: 18px 20px; margin-bottom: 30px;">
                        <p style="font-size: 11px; text-transform: uppercase; color: #d9a24a; margin: 0 0 8px 0; font-weight: 600;">Nachricht / Sonderwünsche:</p>
                        <p style="color: #faf6ee; font-style: italic; margin: 0; font-size: 14px;">"${message.replace(/\n/g, '<br>')}"</p>
                      </div>` : ''}

                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 30px;">
                        <tr>
                          <td align="center">
                            <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0; text-align: center;">Anmeldung direkt bearbeiten:</p>
                            <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                              <tr>
                                <td style="border-radius: 4px; background-color: #10b981;">
                                  <a href="${acceptLink}" target="_blank" style="padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">🏛️ ANNEHMEN (Zusagen)</a>
                                </td>
                                <td width="15"></td>
                                <td style="border-radius: 4px; background-color: #ef4444;">
                                  <a href="${rejectLink}" target="_blank" style="padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">❌ ABLEHNEN (Absagen)</a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Customer Eingangsbestätigung
      const customerPendingEmailHtml = `
        <!DOCTYPE html>
        <html lang="de">
        <head><meta charset="UTF-8"></head>
        <body style="margin: 0; padding: 0; background-color: #07090d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #faf6ee;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #07090d; padding: 40px 10px;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #131722; border: 1px solid rgba(217, 162, 74, 0.15); border-radius: 8px; overflow: hidden; box-shadow: 0 25px 60px rgba(0,0,0,0.5);">
                  <tr>
                    <td style="background-color: #0d111a; padding: 35px 30px; text-align: center; border-bottom: 2px solid #d9a24a;">
                      <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; color: #faf6ee; font-weight: 400; text-transform: uppercase;">Stephan van Hausen</h1>
                      <p style="margin: 6px 0 0 0; font-size: 11px; color: #d9a24a; text-transform: uppercase; font-weight: 500;">Nachtwächter-Führungen Nienburg</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="font-family: Georgia, serif; font-size: 18px; color: #faf6ee; margin-bottom: 20px; font-style: italic;">Hallo ${name},</p>
                      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                        vielen Dank für Ihre Anmeldung zur öffentlichen Nachtwächter-Führung am ${date}!
                      </p>
                      <p style="color: #94a3b8; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                        Da die Teilnehmerzahl für unsere öffentlichen Führungen begrenzt ist, wird Ihre Anmeldung derzeit von mir geprüft. Sie erhalten in Kürze eine weitere E-Mail mit der verbindlichen Bestätigung.
                      </p>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px; border-collapse: collapse; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <tr><td style="padding: 12px; color: #d9a24a; font-weight: 600; width: 40%; font-size: 11px; text-transform: uppercase;">Termin</td><td style="padding: 12px; color: #faf6ee; font-weight: bold;">${date}</td></tr>
                        <tr><td style="padding: 12px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Uhrzeit</td><td style="padding: 12px; color: #faf6ee; font-weight: bold;">18:00 Uhr</td></tr>
                        <tr><td style="padding: 12px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Treffpunkt</td><td style="padding: 12px; color: #faf6ee; font-weight: bold;">Lange Straße (Höhe Cup&amp;Cino)</td></tr>
                        <tr><td style="padding: 12px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Teilnehmer</td><td style="padding: 12px; color: #faf6ee;">${groupSize} Personen</td></tr>
                      </table>
                      <p style="color: #94a3b8; font-size: 14px; margin: 0;">Herzliche Grüße,<br>Stephan van Hausen</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      // Admin Mail senden
      const res1 = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `Stephan van Hausen Anfragen <noreply@scholz-friese-webdesign.de>`,
          to: recipientEmail,
          reply_to: email,
          subject: `[Stephan-van-Hausen] 🎫 Neue Anmeldung öffentliche Führung: ${name}`,
          html: adminEmailHtml
        }),
      });

      // Kunde Eingangsbestätigung
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `Stephan van Hausen <noreply@scholz-friese-webdesign.de>`,
          to: email,
          reply_to: 'Info@nienburger-nachtwaechter.de',
          subject: `Eingangsbestätigung: Anmeldung zur öffentlichen Nachtwächter-Führung am ${date}`,
          html: customerPendingEmailHtml
        }),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- Private Führung: Admin Benachrichtigung ---
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html lang="de">
      <head><meta charset="UTF-8"></head>
      <body style="margin: 0; padding: 0; background-color: #07090d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #07090d; padding: 40px 10px;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #131722; border: 1px solid rgba(217, 162, 74, 0.15); overflow: hidden; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td style="background-color: #0d111a; padding: 35px 30px; text-align: center; border-bottom: 2px solid #d9a24a;">
                    <h1 style="margin: 0; font-family: Georgia, serif; font-size: 24px; letter-spacing: 0.08em; color: #faf6ee; text-transform: uppercase;">Stephan van Hausen</h1>
                    <p style="margin: 6px 0 0 0; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #d9a24a;">Nachtwächter-Führungen Nienburg</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 45px 35px;">
                    <p style="font-family: Georgia, serif; font-size: 20px; color: #faf6ee; margin: 0 0 15px 0; font-style: italic;">Hallo Stephan,</p>
                    <p style="color: #94a3b8; font-size: 14.5px; line-height: 1.65; margin: 0 0 30px 0;">
                      über die Website wurde eine neue Buchungsanfrage übermittelt:
                    </p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 35px; border-collapse: collapse; border: 1px solid rgba(255, 255, 255, 0.05);">
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; width: 38%; font-size: 11px; text-transform: uppercase;">Kunde</td><td style="padding: 12px 16px; color: #faf6ee;">${name}</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">E-Mail</td><td style="padding: 12px 16px; color: #faf6ee;"><a href="mailto:${email}" style="color: #d9a24a; text-decoration: none;">${email}</a></td></tr>
                      ${phone ? `<tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Telefon</td><td style="padding: 12px 16px; color: #faf6ee;">${phone}</td></tr>` : ''}
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Wunschtermin</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">${date}</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Treffpunkt</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">Lange Straße, Höhe Cup&amp;Cino</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Uhrzeit</td><td style="padding: 12px 16px; color: #faf6ee; font-weight: bold;">${time || 'Nicht angegeben'} Uhr</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Führungstyp</td><td style="padding: 12px 16px; color: #faf6ee;">${tourType}</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Gruppengröße</td><td style="padding: 12px 16px; color: #faf6ee;">${groupSize} Personen</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Gewand-Zuschlag</td><td style="padding: 12px 16px; color: #faf6ee;">${gewandZuschlag ? 'Ja (+10,00 €)' : 'Nein'}</td></tr>
                      <tr><td style="padding: 12px 16px; color: #d9a24a; font-weight: 600; font-size: 11px; text-transform: uppercase;">Kalkulierter Preis</td><td style="padding: 12px 16px; color: #d9a24a; font-weight: bold; font-size: 16px;">${cost},00 €</td></tr>
                    </table>

                    ${message ? `
                    <div style="background-color: rgba(217, 162, 74, 0.04); border-left: 3px solid #d9a24a; padding: 18px 20px; margin-bottom: 30px;">
                      <p style="font-size: 11px; text-transform: uppercase; color: #d9a24a; margin: 0 0 8px 0; font-weight: 600;">Nachricht / Sonderwünsche:</p>
                      <p style="color: #faf6ee; font-style: italic; margin: 0; font-size: 14px;">"${message.replace(/\n/g, '<br>')}"</p>
                    </div>` : ''}

                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px; border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 30px;">
                      <tr>
                        <td align="center">
                          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px 0; text-align: center;">Anfrage direkt bearbeiten:</p>
                          <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                            <tr>
                              <td style="border-radius: 4px; background-color: #10b981;">
                                <a href="${acceptLink}" target="_blank" style="padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">🏛️ ANNEHMEN (Zusagen)</a>
                              </td>
                              <td width="15"></td>
                              <td style="border-radius: 4px; background-color: #ef4444;">
                                <a href="${rejectLink}" target="_blank" style="padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">❌ ABLEHNEN (Absagen)</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `Stephan van Hausen Anfragen <noreply@scholz-friese-webdesign.de>`,
        to: recipientEmail,
        reply_to: email,
        subject: `[Stephan-van-Hausen] 🏛️ Neue Buchungsanfrage von ${name}`,
        html: adminEmailHtml
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(JSON.stringify({ success: false, message: 'Fehler beim Senden über Resend: ' + JSON.stringify(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestOptions(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
