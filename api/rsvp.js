import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

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
      await redis.set(id, JSON.stringify(entry));
      await redis.rpush('rsvp_index', id);
      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to save RSVP' });
    }
  }

  if (req.method === 'GET') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const index = await redis.lrange('rsvp_index', 0, -1);
      if (!index.length) return res.status(200).json({ rsvps: [] });
      const entries = await Promise.all(index.map(id => redis.get(id)));
      const rsvps = entries
        .filter(Boolean)
        .map(e => typeof e === 'string' ? JSON.parse(e) : e);
      return res.status(200).json({ rsvps });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch RSVPs' });
    }
  }

  if (req.method === 'DELETE') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
      const index = await redis.lrange('rsvp_index', 0, -1);
      if (index.length) await Promise.all(index.map(id => redis.del(id)));
      await redis.del('rsvp_index');
      return res.status(200).json({ status: 'cleared' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to clear' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}