// src/app/api/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { createSSRSassClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createSSRSassClient()
        const client = supabase.getSupabaseClient()

        // Exchange the code for a session
        const { error: sessionError } = await client.auth.exchangeCodeForSession(code)
        
        if (sessionError) {
            console.error('Error exchanging code for session:', sessionError)
            return NextResponse.redirect(new URL('/auth/login?error=oauth_error', request.url))
        }

        // Check MFA status
        const { data: aal, error: aalError } = await client.auth.mfa.getAuthenticatorAssuranceLevel()

        if (aalError) {
            console.error('Error checking MFA status:', aalError)
            // Don't fail on MFA check error, just proceed to app
            return NextResponse.redirect(new URL('/app', request.url))
        }

        // If user needs to complete MFA verification
        if (aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
            return NextResponse.redirect(new URL('/auth/2fa', request.url))
        }

        // If MFA is not required or already verified, proceed to app
        return NextResponse.redirect(new URL('/app', request.url))
    }

    // If no code provided, redirect to login with error
    return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
}