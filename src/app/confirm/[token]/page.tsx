'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

interface IntentDetails {
    intentId: string
    amount: number
    type: string
    description?: string
    sender: string
    receiver: string
    expiresAt: string
    currencySymbol: string
    worldName: string
    taxAmount?: number
    netAmount?: number
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
        async function fetchIntent() {
            try {
                const res = await fetch(`/api/transactions/intent/details?token=${token}`)
                const data = await res.json()

                if (!data.success) {
                    setError(data.error || 'Transaction not found')
                    return
                }

                setIntent(data.data)
            } catch {
                setError('Failed to load transaction details')
            } finally {
                setLoading(false)
            }
        }

        if (token) {
            fetchIntent()
        }
    }, [token])

    async function handleConfirm() {
        setProcessing(true)
        try {
            const res = await fetch('/api/transactions/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'confirm' }),
            })
            const data = await res.json()

            if (data.success) {
                setResult({ success: true, message: 'Transaction completed successfully!' })
            } else {
                setResult({ success: false, message: data.error || 'Transaction failed' })
            }
        } catch {
            setResult({ success: false, message: 'Failed to process transaction' })
        } finally {
            setProcessing(false)
        }
    }

    async function handleCancel() {
        setProcessing(true)
        try {
            await fetch('/api/transactions/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, action: 'cancel' }),
            })
            setResult({ success: true, message: 'Transaction cancelled' })
        } catch {
            setResult({ success: false, message: 'Failed to cancel' })
        } finally {
            setProcessing(false)
        }
    }

    // Auth check
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-300">Loading...</p>
                </div>
            </div>
        )
    }

    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Sign In Required</h1>
                    <p className="text-gray-300 mb-6">Please sign in to confirm this transaction.</p>
                    <Link
                        href={`/login?callbackUrl=/confirm/${token}`}
                        className="btn-primary inline-block"
                    >
                        Sign In with Discord
                    </Link>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto"></div>
                    <p className="mt-4 text-gray-300">Loading transaction...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-white mb-4">Transaction Error</h1>
                    <p className="text-red-400 mb-6">{error}</p>
                    <Link href="/dashboard" className="btn-secondary inline-block">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        )
    }

    if (result) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="glass-card p-8 max-w-md w-full mx-4 text-center">
                    <div className="text-6xl mb-4">{result.success ? '✅' : '❌'}</div>
                    <h1 className="text-2xl font-bold text-white mb-4">
                        {result.success ? 'Success!' : 'Failed'}
                    </h1>
                    <p className={result.success ? 'text-green-400' : 'text-red-400'}>{result.message}</p>
                    <div className="mt-6 space-x-4">
                        <Link href="/dashboard" className="btn-primary inline-block">
                            Go to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (!intent) {
        return null
    }

    const expiresAt = new Date(intent.expiresAt)
    const isExpired = new Date() > expiresAt

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
            <div className="glass-card p-8 max-w-lg w-full">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Confirm Transaction</h1>
                    <p className="text-gray-400">Review and confirm this payment</p>
                </div>

                {isExpired && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 text-center">
                        <p className="text-red-400 font-medium">This transaction has expired</p>
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    {/* Amount */}
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                        <p className="text-gray-400 text-sm">Amount</p>
                        <p className="text-4xl font-bold text-white">
                            {intent.currencySymbol}{intent.amount.toLocaleString()}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="bg-white/5 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-400">From</span>
                            <span className="text-white font-medium">{intent.sender}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">To</span>
                            <span className="text-white font-medium">{intent.receiver}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Type</span>
                            <span className="text-purple-400">{intent.type}</span>
                        </div>
                        {intent.description && (
                            <div className="border-t border-white/10 pt-3 mt-3">
                                <p className="text-gray-400 text-sm">Description</p>
                                <p className="text-white">{intent.description}</p>
                            </div>
                        )}
                    </div>

                    {/* Tax info */}
                    {intent.taxAmount !== undefined && intent.taxAmount > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-yellow-400">Sales Tax</span>
                                <span className="text-yellow-400">-{intent.currencySymbol}{intent.taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium mt-2">
                                <span className="text-white">Receiver Gets</span>
                                <span className="text-white">{intent.currencySymbol}{intent.netAmount?.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* Expiration */}
                    {!isExpired && (
                        <p className="text-center text-sm text-gray-400">
                            Expires: {expiresAt.toLocaleString()}
                        </p>
                    )}
                </div>

                {/* Actions */}
                {!isExpired && (
                    <div className="flex gap-4">
                        <button
                            onClick={handleCancel}
                            disabled={processing}
                            className="flex-1 py-3 px-6 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={processing}
                            className="flex-1 py-3 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-90 transition disabled:opacity-50"
                        >
                            {processing ? 'Processing...' : 'Confirm Payment'}
                        </button>
                    </div>
                )}

                {isExpired && (
                    <Link
                        href="/dashboard"
                        className="block w-full text-center py-3 px-6 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition"
                    >
                        Return to Dashboard
                    </Link>
                )}

                {/* Signed in as */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    Signed in as {session?.user?.name}
                </p>
            </div>
        </div>
    )
}
