
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/reset-password';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      // The server exchange stores cookies, but the client-side Supabase
      // instance also needs a browser session to call updateUser().
      const sessionParams = new URLSearchParams({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        type: 'recovery',
      });
      return NextResponse.redirect(`${origin}${next}#${sessionParams.toString()}`);
    }
  }

  if (tokenHash && type === 'recovery') {
    const resetUrl = new URL(`${origin}${next}`);
    resetUrl.searchParams.set('token_hash', tokenHash);
    resetUrl.searchParams.set('type', type);
    return NextResponse.redirect(resetUrl);
  }

  // Exchange failed — send to reset page which shows the invalid link UI
  return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
}
