const { Resend } = require('resend');

const fagLabels = {
  brolaegning: 'Brolægning - vikarbureau',
  fjernvarme: 'Fjernvarme - vikarbureau',
  montage: 'Generel montage - vikarbureau',
  dykpumper: 'Dykpumper & afvanding',
  'privat-indkoersel': 'Privat - indkørsel',
  'privat-terrasse': 'Privat - terrasse',
  'privat-anlaeg': 'Privat - anlæg & belægning',
  'privat-andet': 'Privat - andet',
  andet: 'Andet',
};

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Videresend lead til Nordic Team OS (CRM). Fejler ALDRIG hårdt — må ikke kunne
// bryde kontaktformularen. Springes over hvis OS_INGEST_TOKEN ikke er sat endnu.
async function forwardLeadToOS(lead) {
  const base = (process.env.OS_API_URL || 'https://nordic-team-os-production.up.railway.app')
    .trim().replace(/\/$/, '');
  const token = (process.env.OS_INGEST_TOKEN || '').trim();
  if (!token) return; // ikke konfigureret endnu — graceful skip
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${base}/api/ingest/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Ingest-Token': token },
      body: JSON.stringify({
        navn: lead.navn,
        firma: lead.firma || null,
        telefon: lead.telefon,
        email: lead.email,
        ydelse: lead.ydelse || null,
        ydelse_label: lead.ydelseLabel || null,
        besked: lead.besked || null,
        kilde: 'kontaktform',
        source: 'nordic-team.dk',
        // Marketing-attribution — feltnavne matcher OS' ingest-kontrakt (LeadIn)
        utm_kilde: lead.utm_source || null,
        utm_medium: lead.utm_medium || null,
        utm_kampagne: lead.utm_campaign || null,
        landingsside: lead.landingsside || null,
        referrer: lead.referrer || null,
      }),
      signal: ctrl.signal,
    });
    if (!r.ok) console.error('OS lead-ingest svarede HTTP', r.status);
  } catch (err) {
    console.error('OS lead-ingest fejlede (ignoreret):', err && err.message);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    navn, firma, telefon, email, ydelse, besked,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, landingsside, referrer,
  } = req.body || {};

  if (!navn || !telefon || !email) {
    return res.status(400).json({ error: 'Udfyld navn, telefon og e-mail' });
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.error('RESEND_API_KEY mangler');
    return res.status(500).json({ error: 'Email-tjeneste ikke konfigureret' });
  }

  const resend = new Resend(apiKey);
  const ydelseLabel = fagLabels[ydelse] || ydelse || 'Ikke angivet';

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0F2A47">
      <h2 style="color:#0F2A47;border-bottom:3px solid #F47920;padding-bottom:8px">Ny forespørgsel fra nordic-team.dk</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;font-weight:600;width:140px">Navn:</td><td style="padding:8px 0">${esc(navn)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Firma:</td><td style="padding:8px 0">${esc(firma || '-')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Telefon:</td><td style="padding:8px 0"><a href="tel:${esc(telefon)}" style="color:#F47920">${esc(telefon)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:600">E-mail:</td><td style="padding:8px 0"><a href="mailto:${esc(email)}" style="color:#F47920">${esc(email)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Ydelse:</td><td style="padding:8px 0">${esc(ydelseLabel)}</td></tr>
      </table>
      ${besked ? `<div style="margin-top:24px"><div style="font-weight:600;margin-bottom:8px">Besked:</div><div style="background:#F8FAFC;padding:16px;border-left:3px solid #F47920;white-space:pre-wrap">${esc(besked)}</div></div>` : ''}
      <p style="margin-top:32px;color:#64748B;font-size:13px">Sendt via kontaktformularen på nordic-team.dk</p>
    </div>
  `;

  const text = [
    `Ny forespørgsel fra nordic-team.dk`,
    ``,
    `Navn:    ${navn}`,
    `Firma:   ${firma || '-'}`,
    `Telefon: ${telefon}`,
    `E-mail:  ${email}`,
    `Ydelse:  ${ydelseLabel}`,
    ``,
    `Besked:`,
    besked || '(ingen besked)',
  ].join('\n');

  try {
    const fromAddress = (process.env.RESEND_FROM || 'Nordic Team <onboarding@resend.dev>').trim();
    const toAddress = (process.env.CONTACT_TO || 'info@nordic-team.dk').trim();

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      replyTo: email,
      subject: `Ny forespørgsel: ${navn}${firma ? ' (' + firma + ')' : ''}`,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Kunne ikke sende email' });
    }

    // Leadet er sikret via mail — send det også til OS/CRM (må ikke blokere svaret)
    await forwardLeadToOS({
      navn, firma, telefon, email, ydelse, ydelseLabel, besked,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, landingsside, referrer,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ error: 'Kunne ikke sende email' });
  }
};
