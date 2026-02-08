'use client'

import { useState, useEffect } from 'react'

interface TaxRates {
    salesTaxRate: number
    incomeTaxRate: number
    propertyTaxRate: number
}

interface AdjustTaxRatesModalProps {
    worldId: string
    currentRates: TaxRates
    onClose: () => void
    onSuccess: (newRates: TaxRates) => void
}

export default function AdjustTaxRatesModal({ worldId, currentRates, onClose, onSuccess }: AdjustTaxRatesModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [rates, setRates] = useState<TaxRates>(currentRates)

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
            const res = await fetch(`/api/worlds/${worldId}/treasury`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rates)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to update tax rates')
            }

            setIsVisible(false)
            setTimeout(() => onSuccess(rates), 200)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update tax rates')
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
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                backgroundColor: isVisible ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0)',
                backdropFilter: isVisible ? 'blur(8px)' : 'blur(0px)',
                WebkitBackdropFilter: isVisible ? 'blur(8px)' : 'blur(0px)',
                transition: 'all 0.3s ease-out'
            }}
            onClick={handleClose}
        >
            <div
                style={{
                    background: 'rgba(20, 20, 30, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '450px',
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(40px)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📈</span>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white' }}>Adjust Tax Rates</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '12px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={labelStyle}>Sales Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.salesTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, salesTaxRate: Number(e.target.value) }))}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Income Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.incomeTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Property Tax (%)</label>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={rates.propertyTaxRate}
                            onChange={e => setRates(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ paddingTop: '8px' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: 'linear-gradient(to right, #10b981, #0f766e)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
