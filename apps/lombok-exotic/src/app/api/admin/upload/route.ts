import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { AuthorizationError } from '@lombok-exotic/core/auth';
import { requireCapability } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * Product image upload → `public/uploads/products/`. MVP local-disk store;
 * in production this dir must be a persistent volume (or swap for R2).
 */
export async function POST(req: Request) {
  try {
    await requireCapability('catalog:write');
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    throw err;
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no_file' }, { status: 400 });
  if (!EXT[file.type]) return NextResponse.json({ error: 'not_image' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'too_large' }, { status: 400 });

  const name = `${crypto.randomUUID()}.${EXT[file.type]}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', 'products');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/products/${name}` });
}
