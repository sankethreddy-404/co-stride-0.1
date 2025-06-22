import {createServerClient} from '@supabase/ssr'
import {ClientType, SassClient} from "@/lib/supabase/unified";
import {Database} from "@/lib/types";
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export async function createSSRClient(cookieStore?: ReadonlyRequestCookies) {
    let cookies: ReadonlyRequestCookies;
    
    if (cookieStore) {
        cookies = cookieStore;
    } else {
        // Fallback for when cookie store is not provided
        const { cookies: getCookies } = await import('next/headers');
        cookies = await getCookies();
    }

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookies.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookies.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            }
        }
    )
}

export async function createSSRSassClient(cookieStore?: ReadonlyRequestCookies) {
    const client = await createSSRClient(cookieStore);
    return new SassClient(client, ClientType.SERVER);
}