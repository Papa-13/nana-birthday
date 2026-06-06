import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST — submit RSVP
  if (req.method === 'POST') {
    try {
      const { name, events, guestSummary, totalGuests } = req.body;
      if (!name || !events?.length) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const id = `rsvp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const entry = {
        id, name, events, guestSummary, totalGuests,
        submitted: new Date().toLocaleString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      };
      // Store individual entry
      await kv.set(id, JSON.stringify(entry));
      // Maintain index list
      const index = await kv.get('rsvp_index') || [];
      index.push(id);
      await kv.set('rsvp_index', index);
      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save RSVP' });
    }
  }

  // GET — fetch all RSVPs (admin only)
  if (req.method === 'GET') {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const index = await kv.get('rsvp_index') || [];
      if (!index.length) return res.status(200).json({ rsvps: [] });
      const entries = await Promise.all(
        index.map(id => kv.get(id))
      );
      const rsvps = entries
        .filter(Boolean)
        .map(e => typeof e === 'string' ? JSON.parse(e) : e);
      return res.status(200).json({ rsvps });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch RSVPs' });
    }
  }

  // DELETE — clear all (admin only)
  if (req.method === 'DELETE') {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const index = await kv.get('rsvp_index') || [];
      await Promise.all(index.map(id => kv.del(id)));
      await kv.del('rsvp_index');
      return res.status(200).json({ status: 'cleared' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to clear' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
