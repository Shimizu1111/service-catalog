export async function onRequest(context) {
  const { request, env } = context;
  const method = request.method;

  // GETリクエストは認証不要
  if (method === 'GET') {
    return context.next();
  }

  // POST/PUT/DELETEは認証が必要
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!env.ADMIN_PASSWORD || token !== env.ADMIN_PASSWORD) {
    return Response.json({ error: '認証が必要です' }, { status: 401 });
  }

  return context.next();
}
