"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleOAuth = async (provider: string) => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/dashboard" });
    } catch {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-accent/8 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/3 w-60 h-60 bg-purple-600/8 rounded-full blur-[100px]" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">O</span>
            </div>
            <span className="text-2xl font-bold tracking-tight gradient-text">
              Oply
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
            <p className="text-sm text-muted">
              Sign in to your Oply account to continue
            </p>
          </div>

          <div className="space-y-3">
            {/* GitHub OAuth */}
            <button
              onClick={() => handleOAuth("github")}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-border hover:border-foreground/20 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {isLoading === "github" ? (
                <span className="text-sm">Connecting to GitHub...</span>
              ) : (
                <span className="text-sm font-medium">Continue with GitHub</span>
              )}
            </button>

            {/* Google OAuth */}
            <button
              onClick={() => handleOAuth("google")}
              disabled={isLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-border hover:border-foreground/20 hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {isLoading === "google" ? (
                <span className="text-sm">Connecting to Google...</span>
              ) : (
                <span className="text-sm font-medium">Continue with Google</span>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-xs text-muted">
              By continuing, you agree to Oply&apos;s{" "}
              <a href="#" className="text-accent hover:underline">Terms of Service</a>{" "}
              and{" "}
              <a href="#" className="text-accent hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          New to Oply? Sign in above to create your account automatically.
        </p>
      </div>
    </div>
  );
}
