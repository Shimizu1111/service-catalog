export async function onRequestGet(context) {
  const { env, params } = context;
  const { key } = params;

  const object = await env.IMAGES.get(key);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('content-type', object.httpMetadata?.contentType || 'image/png');
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
