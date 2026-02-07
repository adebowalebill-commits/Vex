'use client'

import { useState, useEffect } from 'react'

interface CreateWorldModalProps {
    onClose: () => void
    onSuccess: () => void
}

export default function CreateWorldModal({ onClose, onSuccess }: CreateWorldModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discordServerId: '',
        currencyName: 'Credits',
        currencySymbol: '©',
        salesTaxRate: 5,
        incomeTaxRate: 10,
        propertyTaxRate: 2,
        initialCitizenBalance: 1000
    })

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10)
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 200)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/worlds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create world')
            }

            setIsVisible(false)
            setTimeout(onSuccess, 200)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create world')
        } finally {
            setLoading(false)
        }
    }

    const inputStyle = {
        width: '100%',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s'
    }

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        color: '#9ca3af',
        marginBottom: '6px'
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/80 backdrop-blur-sm' : 'bg-transparent pointer-events-none'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-md bg-[#14141e]/95 border border-white/10 rounded-2xl p-6 shadow-2xl transition-all duration-300 transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '90vh', overflowY: 'auto' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🌍</span>
                        <h2 className="text-xl font-semibold text-white">Create New World</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-gray-400 hover:bg-white/20 hover:text-white transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">World Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="My Awesome Economy"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors min-h-[60px] resize-y"
                            placeholder="A thriving virtual economy..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Discord Server ID *</label>
                        <input
                            type="text"
                            required
                            value={formData.discordServerId}
                            onChange={e => setFormData(prev => ({ ...prev, discordServerId: e.target.value }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            placeholder="123456789012345678"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            Right-click server → Copy Server ID (Developer Mode)
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Currency Name</label>
                            <input
                                type="text"
                                value={formData.currencyName}
                                onChange={e => setFormData(prev => ({ ...prev, currencyName: e.target.value }))}
                                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Symbol</label>
                            <input
                                type="text"
                                value={formData.currencySymbol}
                                onChange={e => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500 transition-colors"
                                maxLength={3}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Tax Rates (%)</label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] text-gray-500 mb-1">Sales</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.salesTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, salesTaxRate: Number(e.target.value) }))}
                                    className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-500 mb-1">Income</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.incomeTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                                    className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-gray-500 mb-1">Property</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.propertyTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                                    className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm text-center focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Starting Balance</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.initialCitizenBalance}
                            onChange={e => setFormData(prev => ({ ...prev, initialCitizenBalance: Number(e.target.value) }))}
                            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3.5 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                        >
                            {loading ? 'Creating...' : 'Create World'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
