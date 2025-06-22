import {createServerClient} from '@supabase/ssr'
import {ClientType, SassClient} from "@/lib/supabase/unified";
import {Database} from "@/lib/types";
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

export async function createSSRClient(cookiesFn?: () => Promise<ReadonlyRequestCookies>) {
    let cookieStore: ReadonlyRequestCookies;
    
    if (cookiesFn) {
        cookieStore = await cookiesFn();
    } else {
        // Fallback for when cookies function is not provided
        const { cookies } = await import('next/headers');
        cookieStore = await cookies();
    }

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
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



export async function createSSRSassClient(cookiesFn?: () => Promise<ReadonlyRequestCookies>) {
    const client = await createSSRClient(cookiesFn);
    return new SassClient(client, ClientType.SERVER);
}