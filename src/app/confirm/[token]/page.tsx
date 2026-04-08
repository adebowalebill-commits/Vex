'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface IntentDetails {
    intentId: string; amount: number; type: string; description?: string
    sender: string; receiver: string; expiresAt: string; currencySymbol: string
    worldName: string; taxAmount?: number; netAmount?: number
}

const pageWrap: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-bg-primary)', padding: 'var(--space-md)', position: 'relative', overflow: 'hidden',
}
const glowBg: React.CSSProperties = {
    position: 'absolute', top: '-120px', left: '50%', transform: 'translateX(-50%)',
    width: '600px', height: '400px',
    background: 'radial-gradient(ellipse, rgba(88,101,242,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
}

export default function ConfirmTransactionPage() {
    const params = useParams()
    const { data: session, status } = useSession()
    const token = params.token as string
    const [intent, setIntent] = useState<IntentDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processing, setProcessing] = useState(false)
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

    useEffect(() => {
        if (token) {
            (async () => {
                try {
                    const res = await fetch(`/api/transactions/intent/details?token=${token}`)
                    const data = await res.json()
                    if (!data.success) { setError(data.error || 'Transaction not found'); return }
                    setIntent(data.data)
                } catch { setError('Failed to load transaction details') }
                finally { setLoading(false) }
            })()
        }
    }, [token])

    async function handleConfirm() {
        setProcessing(true)
        try {
            const res = await fetch('/api/transactions/confirm', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'confirm' }),
            })
            const data = await res.json()
            setResult(data.success
                ? { success: true, message: 'Transaction completed successfully!' }
                : { success: false, message: data.error || 'Transaction failed' })
        } catch { setResult({ success: false, message: 'Failed to process transaction' }) }
        finally { setProcessing(false) }
    }

    async function handleCancel() {
        setProcessing(true)
        try {
            await fetch('/api/transactions/confirm', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'cancel' }),
            })
            setResult({ success: true, message: 'Transaction cancelled' })
        } catch { setResult({ success: false, message: 'Failed to cancel' }) }
        finally { setProcessing(false) }
    }

    /* ---------- State screens ---------- */
    if (status === 'loading' || loading) {
        return (
            <div style={pageWrap}>
                <div style={glowBg} />
                <div className="glass-card p-8" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--color-text-secondary)' }}>{status === 'loading' ? 'Loading...' : 'Loading transaction...'}</p>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated') {
        return (
            <div style={pageWrap}>
                <div style={glowBg} />
                <div className="glass-card p-8" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Sign In Required</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Please sign in to confirm this transaction.</p>
                    <Link href={`/login?callbackUrl=/confirm/${token}`} className="btn btn-primary" style={{ width: '100%' }}>
                        Sign In with Discord
                    </Link>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div style={pageWrap}>
                <div style={glowBg} />
                <div className="glass-card p-8" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Transaction Error</h1>
                    <p style={{ color: 'var(--color-error)', marginBottom: '24px' }}>{error}</p>
                    <Link href="/dashboard" className="btn btn-secondary">Return to Dashboard</Link>
                </div>
            </div>
        )
    }

    if (result) {
        return (
            <div style={pageWrap}>
                <div style={glowBg} />
                <div className="glass-card p-8" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>{result.success ? '✅' : '❌'}</div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>{result.success ? 'Success!' : 'Failed'}</h1>
                    <p style={{ color: result.success ? 'var(--color-success)' : 'var(--color-error)', marginBottom: '24px' }}>{result.message}</p>
                    <Link href="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
                </div>
            </div>
        )
    }

    if (!intent) return null

    const expiresAt = new Date(intent.expiresAt)
    const isExpired = new Date() > expiresAt

    return (
        <div style={pageWrap}>
            <div style={glowBg} />
            <div className="glass-card p-8" style={{ maxWidth: '520px', width: '100%', position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '6px' }}>Confirm Transaction</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Review and confirm this payment</p>
                </div>

                {isExpired && (
                    <div style={{
                        background: 'var(--color-error-bg)', border: '1px solid rgba(218,55,60,0.3)',
                        borderRadius: 'var(--radius-lg)', padding: '14px', marginBottom: '20px', textAlign: 'center',
                    }}>
                        <p style={{ color: 'var(--color-error)', fontWeight: 500 }}>This transaction has expired</p>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {/* Amount */}
                    <div style={{
                        background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)',
                        padding: '20px', textAlign: 'center',
                    }}>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '4px' }}>Amount</p>
                        <p style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>
                            {intent.currencySymbol}{intent.amount.toLocaleString()}
                        </p>
                    </div>

                    {/* Details */}
                    <div style={{
                        background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)',
                        padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px',
                    }}>
                        {[
                            { label: 'From', value: intent.sender },
                            { label: 'To', value: intent.receiver },
                            { label: 'Type', value: intent.type, accent: true },
                        ].map((row, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{row.label}</span>
                                <span style={{ fontWeight: 500, fontSize: '14px', color: row.accent ? 'var(--color-accent)' : 'var(--color-text-primary)' }}>{row.value}</span>
                            </div>
                        ))}
                        {intent.description && (
                            <div style={{ borderTop: '1px solid var(--color-card-border)', paddingTop: '10px', marginTop: '4px' }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '4px' }}>Description</p>
                                <p style={{ fontSize: '14px' }}>{intent.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Tax info */}
                    {intent.taxAmount !== undefined && intent.taxAmount > 0 && (
                        <div style={{
                            background: 'var(--color-warning-bg)', border: '1px solid rgba(240,178,50,0.3)',
                            borderRadius: 'var(--radius-lg)', padding: '14px',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--color-warning)' }}>Sales Tax</span>
                                <span style={{ color: 'var(--color-warning)', fontFamily: 'var(--font-mono)' }}>-{intent.currencySymbol}{intent.taxAmount.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginTop: '8px' }}>
                                <span>Receiver Gets</span>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{intent.currencySymbol}{intent.netAmount?.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {!isExpired && (
                        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            Expires: {expiresAt.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Actions */}
                {!isExpired && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleCancel} disabled={processing} className="btn btn-secondary" style={{ flex: 1, padding: '14px' }}>
                            Cancel
                        </button>
                        <button onClick={handleConfirm} disabled={processing} className="btn btn-primary" style={{ flex: 1, padding: '14px' }}>
                            {processing ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </div>
                )}

                {isExpired && (
                    <Link href="/dashboard" className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
                        Return to Dashboard
                    </Link>
                )}

                <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '20px' }}>
                    Signed in as {session?.user?.name}
                </p>
            </div>
        </div>
    )
}
