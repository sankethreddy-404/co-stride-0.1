'use client';

import { createSPASassClient } from '@/lib/supabase/client';

interface SSOButtonsProps {
    onError?: (error: string) => void;
}

export default function SSOButtons({ onError }: SSOButtonsProps) {
    const handleGoogleLogin = async () => {
        try {
            const client = await createSPASassClient();
            const { error } = await client.signInWithGoogle();

            if (error) throw error;
        } catch (err: Error | unknown) {
            if (err instanceof Error) {
                onError?.(err.message);
            } else {
                onError?.('An unknown error occurred');
            }
        }
    };

    return (
        <div className="mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"/>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
            </div>

            <div className="mt-6">
                <button
                    onClick={handleGoogleLogin}
                    className="group relative flex h-11 items-center rounded-md border border-gray-300 px-6 transition-colors duration-200 bg-white hover:bg-gray-50 text-gray-700 w-full"
                >
                    <div className="absolute left-6">
                        <div className="flex h-5 w-5 items-center justify-center">
                            <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
                                <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
                                <path d="M10 20c2.67 0 4.9-.89 6.57-2.43l-3.16-2.45c-.89.59-2.01.96-3.41.96-2.61 0-4.83-1.76-5.63-4.13H1.07v2.51C2.72 17.75 6.09 20 10 20z" fill="#34A853"/>
                                <path d="M4.37 11.95c-.2-.6-.31-1.24-.31-1.95s.11-1.35.31-1.95V5.54H1.07C.38 6.84 0 8.36 0 10s.38 3.16 1.07 4.46l3.3-2.51z" fill="#FBBC05"/>
                                <path d="M10 3.98c1.48 0 2.79.51 3.83 1.5l2.78-2.78C14.93 1.03 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.54l3.3 2.51C5.17 5.68 7.39 3.98 10 3.98z" fill="#EA4335"/>
                            </svg>
                        </div>
                    </div>
                    <span className="mx-auto text-sm font-semibold">
                        Continue with Google
                    </span>
                </button>
            </div>
        </div>
    );
}