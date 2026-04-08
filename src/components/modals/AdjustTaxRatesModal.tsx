'use client'

import { useState, useEffect } from 'react'

interface TaxRates { salesTaxRate: number; incomeTaxRate: number; propertyTaxRate: number }

interface AdjustTaxRatesModalProps {
    worldId: string; currentRates: TaxRates
    onClose: () => void; onSuccess: (newRates: TaxRates) => void
}

const modalBg = (visible: boolean): React.CSSProperties => ({
    position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999, padding: '1rem',
    backgroundColor: visible ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0)',
    backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
    WebkitBackdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
    transition: 'all 0.3s ease-out',
})

const modalPanel = (visible: boolean): React.CSSProperties => ({
    background: 'var(--color-bg-secondary)', border: '1px solid var(--color-card-border)',
    borderRadius: 'var(--radius-2xl)', padding: '24px', width: '100%', maxWidth: '450px',
    maxHeight: '90vh', overflowY: 'auto' as const,
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(40px)',
    opacity: visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: 'var(--shadow-xl)',
})

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', minHeight: '44px',
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-card-border)',
    borderRadius: 'var(--radius-lg)', color: 'var(--color-text-primary)', fontSize: '16px',
    outline: 'none', transition: 'border-color 0.2s',
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px',
}

export default function AdjustTaxRatesModal({ worldId, currentRates, onClose, onSuccess }: AdjustTaxRatesModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [rates, setRates] = useState<TaxRates>(currentRates)

    useEffect(() => { const t = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(t) }, [])
    const handleClose = () => { setIsVisible(false); setTimeout(onClose, 200) }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setLoading(true); setError('')
        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rates),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to update tax rates')
            setIsVisible(false); setTimeout(() => onSuccess(rates), 200)
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to update tax rates') }
        finally { setLoading(false) }
    }

    return (
        <div style={modalBg(isVisible)} onClick={handleClose}>
            <div style={modalPanel(isVisible)} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📈</span>
                        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Adjust Tax Rates</h2>
                    </div>
                    <button type="button" onClick={handleClose} style={{
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 'var(--radius-md)', background: 'var(--color-bg-elevated)', border: 'none',
                        color: 'var(--color-text-muted)', cursor: 'pointer', transition: 'all 0.2s',
                    }}>✕</button>
                </div>

                {error && (
                    <div style={{
                        marginBottom: '16px', padding: '12px', background: 'var(--color-error-bg)',
                        border: '1px solid rgba(218,55,60,0.3)', borderRadius: 'var(--radius-md)',
                        color: 'var(--color-error)', fontSize: '14px',
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {([
                        { label: 'Sales Tax (%)', key: 'salesTaxRate' as const },
                        { label: 'Income Tax (%)', key: 'incomeTaxRate' as const },
                        { label: 'Property Tax (%)', key: 'propertyTaxRate' as const },
                    ]).map(field => (
                        <div key={field.key}>
                            <label style={labelStyle}>{field.label}</label>
                            <input type="number" min="0" max="100" value={rates[field.key]}
                                onChange={e => setRates(prev => ({ ...prev, [field.key]: Number(e.target.value) }))}
                                style={inputStyle} />
                        </div>
                    ))}

                    <div style={{ paddingTop: '8px' }}>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{
                            width: '100%', padding: '14px', opacity: loading ? 0.5 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
