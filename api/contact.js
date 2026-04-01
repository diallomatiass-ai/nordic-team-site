const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { navn, firma, telefon, email, faggruppe, behov } = req.body;

  if (!navn || !telefon || !email || !faggruppe || !behov) {
    return res.status(400).json({ error: 'Udfyld alle påkrævede felter' });
  }

  const { error } = await supabase
    .from('inquiries')
    .insert([{ navn, firma: firma || '', telefon, email, faggruppe, behov }]);

  if (error) {
    console.error('Supabase error:', error);
    return res.status(500).json({ error: 'Kunne ikke gemme forespørgsel' });
  }

  return res.status(200).json({ success: true });
};
