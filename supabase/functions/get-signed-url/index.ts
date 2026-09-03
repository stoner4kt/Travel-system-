import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const validResourceTypes = new Set(['image', 'video', 'raw']);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function toUrlSafeBase64(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function createDeliverySignature(deliveryPath: string, apiSecret: string) {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(`${deliveryPath}${apiSecret}`),
  );
  return toUrlSafeBase64(digest).slice(0, 8);
}

function encodePublicId(publicId: string) {
  return publicId.split('/').map((part) => {
    // Cloudinary's SDK decodes an already URL-encoded public ID before
    // encoding it for delivery. This prevents %20 from becoming %2520.
    try {
      return encodeURIComponent(decodeURIComponent(part));
    } catch {
      return encodeURIComponent(part);
    }
  }).join('/');
}

function normalizeVersion(value: unknown) {
  if (typeof value !== 'string') return '';
  const version = value.trim().replace(/^v/i, '');
  return /^\d+$/.test(version) ? `v${version}` : '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!/^Bearer\s+\S+$/i.test(authorization)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const publicId = typeof body?.publicId === 'string' ? body.publicId.trim() : '';
    const resourceType = typeof body?.resourceType === 'string'
      ? body.resourceType.trim().toLowerCase()
      : '';
    const asAttachment = body?.asAttachment === true;
    const requestedVersion = normalizeVersion(body?.version);

    if (!publicId || publicId.length > 512 || /[\u0000-\u001f\u007f]/.test(publicId)) {
      return json({ error: 'publicId is required and must be valid' }, 400);
    }
    if (!validResourceTypes.has(resourceType)) {
      return json({ error: 'Invalid resourceType' }, 400);
    }
    if (body?.asAttachment !== undefined && typeof body.asAttachment !== 'boolean') {
      return json({ error: 'asAttachment must be a boolean' }, 400);
    }
    if (body?.version !== undefined && !requestedVersion) {
      return json({ error: 'version must be a positive integer' }, 400);
    }

    const cloudName = requiredEnv('CLOUDINARY_CLOUD_NAME');
    const apiSecret = requiredEnv('CLOUDINARY_API_SECRET');
    const encodedPublicId = encodePublicId(publicId);
    const deliveryPath = asAttachment ? `fl_attachment/${encodedPublicId}` : encodedPublicId;
    const signature = await createDeliverySignature(deliveryPath, apiSecret);
    // Cloudinary's SDK force_version behavior uses v1 for foldered public IDs
    // when no explicit version is provided. Preserve a version from the
    // original upload URL when available, otherwise match that behavior.
    const version = requestedVersion || (publicId.includes('/') ? 'v1' : '');
    const urlParts = [
      `https://res.cloudinary.com/${encodeURIComponent(cloudName)}`,
      resourceType,
      'authenticated',
      `s--${signature}--`,
    ];
    if (asAttachment) urlParts.push('fl_attachment');
    if (version) urlParts.push(version);
    urlParts.push(encodedPublicId);

    return json({ signedUrl: urlParts.join('/') });
  } catch (error) {
    console.error('[get-signed-url] Failed to generate delivery URL:', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Unable to generate Cloudinary signed URL' }, 500);
  }
});