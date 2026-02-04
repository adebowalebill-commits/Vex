'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

    const handleDiscordLogin = () => {
        signIn('discord', { callbackUrl })
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-primary)',
            padding: 'var(--space-xl)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
            }}>
                {/* Logo */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: 'var(--space-2xl)',
                }}>
                    <Link href="/" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        textDecoration: 'none',
                    }}>
                        <div style={{
                            width: 48,
                            height: 48,
                            background: 'var(--gradient-primary)',
                            borderRadius: 'var(--radius-lg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 'var(--text-xl)',
                            color: 'white',
                        }}>
                            V
                        </div>
                        <span style={{
                            fontSize: 'var(--text-2xl)',
                            fontWeight: 700,
                            background: 'var(--gradient-primary)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            VexiumVerse
                        </span>
                    </Link>
                </div>

                {/* Login Card */}
                <div className="card" style={{
                    padding: 'var(--space-2xl)',
                    textAlign: 'center',
                }}>
                    <h1 style={{
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-sm)',
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-xl)',
                    }}>
                        Sign in to access your economic dashboard
                    </p>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            padding: 'var(--space-md)',
                            background: 'var(--color-error-bg)',
                            border: '1px solid var(--color-error)',
                            borderRadius: 'var(--radius-lg)',
                            marginBottom: 'var(--space-lg)',
                            color: 'var(--color-error)',
                            fontSize: 'var(--text-sm)',
                        }}>
                            {error === 'OAuthAccountNotLinked'
                                ? 'This email is already linked to another account.'
                                : 'An error occurred during sign in. Please try again.'}
                        </div>
                    )}

                    {/* Discord Login Button */}
                    <button
                        onClick={handleDiscordLogin}
                        style={{
                            width: '100%',
                            padding: 'var(--space-md) var(--space-lg)',
                            background: '#5865F2',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            fontSize: 'var(--text-base)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--space-md)',
                            transition: 'all var(--transition-fast)',
                        }}
                        className="btn"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        Continue with Discord
                    </button>

                    <p style={{
                        marginTop: 'var(--space-lg)',
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-text-muted)',
                    }}>
                        By signing in, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>

                {/* Back Link */}
                <div style={{
                    textAlign: 'center',
                    marginTop: 'var(--space-lg)',
                }}>
                    <Link
                        href="/"
                        style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--text-sm)',
                            textDecoration: 'none',
                        }}
                    >
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg-primary)',
            }}>
                <div className="loading-spinner" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    )
}
