'use client'

import { useState, useEffect } from 'react'

interface AdjustTaxRatesModalProps {
    worldId: string
    currentRates: {
        salesTaxRate: number
        incomeTaxRate: number
        propertyTaxRate: number
    }
    onClose: () => void
    onSuccess: (newRates: { salesTaxRate: number; incomeTaxRate: number; propertyTaxRate: number }) => void
}

export default function AdjustTaxRatesModal({
    worldId,
    currentRates,
    onClose,
    onSuccess
}: AdjustTaxRatesModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [rates, setRates] = useState(currentRates)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10)
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 200)
    }

    async function handleSave() {
        setSaving(true)
        setError('')

        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rates)
            })
            const data = await res.json()
            if (data.success) {
                // Animate out
                setIsVisible(false)
                setTimeout(() => onSuccess(rates), 200)
            } else {
                setError(data.error || 'Failed to update rates')
            }
        } catch (err) {
            setError('Failed to update tax rates')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'modal-backdrop opacity-100' : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-md bg-[#14141e]/95 border border-white/10 rounded-2xl p-6 shadow-2xl ${isVisible ? 'modal-content scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl modal-warning-icon">📈</span>
                        <h2 className="text-xl font-semibold text-white">Adjust Tax Rates</h2>
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
                        <label className="block text-sm text-gray-400 mb-1.5">Sales Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.salesTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, salesTaxRate: Number(e.target.value) }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Applied to all business transactions</p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Income Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.incomeTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Deducted from wage payments</p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Property Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.propertyTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white font-medium focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-1">Daily tax on land value</p>
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
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl text-white font-semibold shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all hover:scale-105"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    )
}
