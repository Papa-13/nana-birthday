const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command, ...args])
  });
  const data = await res.json();
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, events, guestSummary, totalGuests } = req.body;
      if (!name || !events?.length) return res.status(400).json({ error: 'Missing fields' });
      const id = `rsvp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const entry = { id, name, events, guestSummary, totalGuests,
        submitted: new Date().toLocaleString('en-GB', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
      };
      await redis('SET', id, JSON.stringify(entry));
      await redis('RPUSH', 'rsvp_index', id);
      return res.status(200).json({ status: 'ok' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save' });
    }
  }

  if (req.method === 'GET') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const index = await redis('LRANGE', 'rsvp_index', 0, -1) || [];
      if (!index.length) return res.status(200).json({ rsvps: [] });
      const entries = await Promise.all(index.map(id => redis('GET', id)));
      const rsvps = entries.filter(Boolean).map(e => typeof e === 'string' ? JSON.parse(e) : e);
      return res.status(200).json({ rsvps });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch' });
    }
  }

  if (req.method === 'DELETE') {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const id = req.query?.id;
      if (id) {
        await redis('DEL', id);
        const index = await redis('LRANGE', 'rsvp_index', 0, -1) || [];
        const newIndex = index.filter(i => i !== id);
        await redis('DEL', 'rsvp_index');
        for (const i of newIndex) await redis('RPUSH', 'rsvp_index', i);
        return res.status(200).json({ status: 'deleted' });
      }
      const index = await redis('LRANGE', 'rsvp_index', 0, -1) || [];
      if (index.length) await Promise.all(index.map(i => redis('DEL', i)));
      await redis('DEL', 'rsvp_index');
      return res.status(200).json({ status: 'cleared' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}