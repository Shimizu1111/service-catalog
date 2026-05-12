export async function onRequestPost(context) {
  const { env, request } = context;
  const body = await request.json();
  const password = body.password || '';

  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return Response.json({ ok: false }, { status: 401 });
  }

  return Response.json({ ok: true });
}
