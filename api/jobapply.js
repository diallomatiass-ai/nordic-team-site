const { Resend } = require('resend');

function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { Navn, Telefon, Email, Faggruppe, Erfaring, Tilgængelig, Besked } = req.body || {};

  if (!Navn || !Telefon || !Email || !Faggruppe) {
    return res.status(400).json({ error: 'Udfyld navn, telefon, e-mail og faggruppe' });
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.error('RESEND_API_KEY mangler');
    return res.status(500).json({ error: 'Email-tjeneste ikke konfigureret' });
  }

  const resend = new Resend(apiKey);

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#0F2A47">
      <h2 style="color:#0F2A47;border-bottom:3px solid #F47920;padding-bottom:8px">Ny jobansøgning fra nordic-team.dk</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:8px 0;font-weight:600;width:160px">Navn:</td><td style="padding:8px 0">${esc(Navn)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Telefon:</td><td style="padding:8px 0"><a href="tel:${esc(Telefon)}" style="color:#F47920">${esc(Telefon)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:600">E-mail:</td><td style="padding:8px 0"><a href="mailto:${esc(Email)}" style="color:#F47920">${esc(Email)}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Faggruppe:</td><td style="padding:8px 0">${esc(Faggruppe)}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Erfaring:</td><td style="padding:8px 0">${esc(Erfaring || '-')}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600">Kan starte:</td><td style="padding:8px 0">${esc(Tilgængelig || '-')}</td></tr>
      </table>
      ${Besked ? `<div style="margin-top:24px"><div style="font-weight:600;margin-bottom:8px">Om ansøgeren:</div><div style="background:#F8FAFC;padding:16px;border-left:3px solid #F47920;white-space:pre-wrap">${esc(Besked)}</div></div>` : ''}
      <p style="margin-top:32px;color:#64748B;font-size:13px">Sendt via job-formularen på nordic-team.dk/job.html</p>
    </div>
  `;

  const text = [
    `Ny jobansøgning fra nordic-team.dk`,
    ``,
    `Navn:      ${Navn}`,
    `Telefon:   ${Telefon}`,
    `E-mail:    ${Email}`,
    `Faggruppe: ${Faggruppe}`,
    `Erfaring:  ${Erfaring || '-'}`,
    `Kan starte: ${Tilgængelig || '-'}`,
    ``,
    `Om ansøgeren:`,
    Besked || '(intet skrevet)',
  ].join('\n');

  try {
    const fromAddress = (process.env.RESEND_FROM || 'Nordic Team <onboarding@resend.dev>').trim();
    const toAddress = (process.env.CONTACT_TO || 'info@nordic-team.dk').trim();

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [toAddress],
      replyTo: Email,
      subject: `Ny jobansøgning: ${Navn} (${Faggruppe})`,
      html,
      text,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Kunne ikke sende ansøgning' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send error:', err);
    return res.status(500).json({ error: 'Kunne ikke sende ansøgning' });
  }
};
