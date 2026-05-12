export async function onRequestPost(context) {
  const { env, request } = context;

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return Response.json({ error: 'multipart/form-data required' }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 });
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return Response.json({ error: 'jpeg, png, webp, gif のみ対応' }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return Response.json({ error: 'ファイルサイズは5MB以下にしてください' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'png';
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await env.IMAGES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return Response.json({ key, url: `/api/images/${key}` }, { status: 201 });
}
