'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface IssueSubsidyModalProps {
    worldId: string
    currencySymbol: string
    maxAmount: number
    onClose: () => void
    onSuccess: () => void
}

interface Citizen {
    id: string
    displayName: string
    discordId: string
    image: string | null
}

export default function IssueSubsidyModal({
    worldId,
    currencySymbol,
    maxAmount,
    onClose,
    onSuccess
}: IssueSubsidyModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [amount, setAmount] = useState('')
    const [recipientId, setRecipientId] = useState('')
    const [description, setDescription] = useState('')
    const [citizens, setCitizens] = useState<Citizen[]>([])
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10)
        fetchCitizens()
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 200)
    }

    async function fetchCitizens() {
        setSearching(true)
        try {
            const res = await fetch(`/api/worlds/${worldId}/citizens?limit=100`)
            const data = await res.json()
            if (data.success) {
                setCitizens(data.data.citizens)
            }
        } catch (err) {
            console.error('Failed to fetch citizens', err)
        } finally {
            setSearching(false)
        }
    }

    async function handleIssue() {
        if (!recipientId) {
            setError('Please select a recipient')
            return
        }
        if (!amount || Number(amount) <= 0) {
            setError('Please enter a valid amount')
            return
        }
        if (Number(amount) > maxAmount) {
            setError('Insufficient treasury funds')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId,
                    amount: Number(amount),
                    description: description || 'Treasury Subsidy'
                })
            })
            const data = await res.json()
            if (data.success) {
                setIsVisible(false)
                setTimeout(onSuccess, 200)
            } else {
                setError(data.error || 'Failed to issue subsidy')
            }
        } catch (err) {
            setError('Failed to issue subsidy')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-md opacity-100' : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-md bg-[#14141e]/95 border border-white/10 rounded-2xl p-6 shadow-2xl ${isVisible ? 'modal-content scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl modal-warning-icon">💸</span>
                        <h2 className="text-xl font-semibold text-white">Issue Subsidy</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Recipient</label>
                        <select
                            value={recipientId}
                            onChange={e => setRecipientId(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                        >
                            <option value="">Select a citizen...</option>
                            {citizens.map(citizen => (
                                <option key={citizen.id} value={citizen.id}>
                                    {citizen.displayName}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            {searching ? 'Loading citizens...' : `${citizens.length} citizens found`}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Amount ({currencySymbol})</label>
                        <input
                            type="number"
                            min="1"
                            max={maxAmount}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Max available: {currencySymbol}{maxAmount.toLocaleString()}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Reason (Optional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="Grant, Reward, etc."
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-8">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3.5 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-all hover:scale-105"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleIssue}
                        disabled={loading}
                        className="flex-1 py-3.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl text-white font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all hover:scale-105"
                    >
                        {loading ? 'Sending...' : 'Send Funds'}
                    </button>
                </div>
            </div>
        </div>
    )
}
