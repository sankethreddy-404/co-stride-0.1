"use client";

import { createSPASassClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      const client = await createSPASassClient();
      const { error: signUpError } = await client.signInWithGoogle();

      if (signUpError) throw signUpError;

      // OAuth redirect will happen automatically
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to sign up with Google"
      );
      setLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create your account
        </h2>
        <p className="text-gray-600">
          Join thousands of teams building accountability together
        </p>
      </div>

      <button
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full flex justify-center items-center gap-3 py-3 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg viewBox="0 0 20 20" className="w-5 h-5" fill="currentColor">
          <path
            d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z"
            fill="#4285F4"
          />
          <path
            d="M10 20c2.67 0 4.9-.89 6.57-2.43l-3.16-2.45c-.89.59-2.01.96-3.41.96-2.61 0-4.83-1.76-5.63-4.13H1.07v2.51C2.72 17.75 6.09 20 10 20z"
            fill="#34A853"
          />
          <path
            d="M4.37 11.95c-.2-.6-.31-1.24-.31-1.95s.11-1.35.31-1.95V5.54H1.07C.38 6.84 0 8.36 0 10s.38 3.16 1.07 4.46l3.3-2.51z"
            fill="#FBBC05"
          />
          <path
            d="M10 3.98c1.48 0 2.79.51 3.83 1.5l2.78-2.78C14.93 1.03 12.7 0 10 0 6.09 0 2.72 2.25 1.07 5.54l3.3 2.51C5.17 5.68 7.39 3.98 10 3.98z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Creating account..." : "Continue with Google"}
      </button>

      <div className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a
          href="/auth/login"
          className="text-primary-600 hover:text-primary-500 underline"
        >
          Sign in
        </a>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        By creating an account, you agree to our{" "}
        <a
          href="/legal/terms"
          className="text-primary-600 hover:text-primary-500 underline"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/legal/privacy"
          className="text-primary-600 hover:text-primary-500 underline"
        >
          Privacy Policy
        </a>
      </div>
    </div>
  );
}
