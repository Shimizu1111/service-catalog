export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    'SELECT * FROM services ORDER BY created_at DESC'
  ).all();

  const services = results.map(row => ({
    ...row,
    tags: JSON.parse(row.tags || '[]'),
    images: JSON.parse(row.images || '[]'),
    demo_url: row.demo_url || '',
    cost: row.cost || '',
  }));

  return Response.json(services);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await request.json();

  if (!body.name?.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 });
  }

  const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
  const tags = JSON.stringify(body.tags || []);
  const images = JSON.stringify((body.images || []).slice(0, 3));
  const now = new Date().toISOString().split('T')[0];

  await env.DB.prepare(
    `INSERT INTO services (id, name, description, url, repo, industry, tags, status, platform, images, demo_url, cost, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    body.name.trim(),
    body.description || '',
    body.url || '',
    body.repo || '',
    body.industry || '',
    tags,
    body.status || 'active',
    body.platform || 'Other',
    images,
    body.demo_url || '',
    body.cost || '',
    now, now
  ).run();

  return Response.json({ id }, { status: 201 });
}
