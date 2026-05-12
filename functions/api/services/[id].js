export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { id } = params;
  const body = await request.json();

  const tags = JSON.stringify(body.tags || []);
  const images = JSON.stringify((body.images || []).slice(0, 3));
  const now = new Date().toISOString().split('T')[0];

  const result = await env.DB.prepare(
    `UPDATE services SET name=?, description=?, url=?, repo=?, industry=?, tags=?, status=?, platform=?, images=?, demo_url=?, cost=?, updated_at=?
     WHERE id=?`
  ).bind(
    body.name?.trim() || '',
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
    now,
    id
  ).run();

  if (result.meta.changes === 0) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { id } = params;

  const result = await env.DB.prepare('DELETE FROM services WHERE id=?').bind(id).run();

  if (result.meta.changes === 0) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  return Response.json({ ok: true });
}
