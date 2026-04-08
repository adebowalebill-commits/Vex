'use client'

import { useState, useEffect } from 'react'

interface IssueSubsidyModalProps {
    worldId: string; currencySymbol: string
    onClose: () => void; onSuccess: () => void
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

export default function IssueSubsidyModal({ worldId, currencySymbol, onClose, onSuccess }: IssueSubsidyModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({ recipientName: '', amount: '', description: 'Treasury Subsidy' })

    useEffect(() => { const t = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(t) }, [])
    const handleClose = () => { setIsVisible(false); setTimeout(onClose, 200) }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setLoading(true); setError('')
        try {
            const res = await fetch(`/api/worlds/${worldId}/treasury/subsidy`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientName: formData.recipientName,
                    amount: Number(formData.amount),
                    description: formData.description,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to issue subsidy')
            setIsVisible(false); setTimeout(onSuccess, 200)
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed to issue subsidy') }
        finally { setLoading(false) }
    }

    return (
        <div style={modalBg(isVisible)} onClick={handleClose}>
            <div style={modalPanel(isVisible)} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>💸</span>
                        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Issue Subsidy</h2>
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
                    <div>
                        <label style={labelStyle}>Recipient Citizen Name</label>
                        <input type="text" required value={formData.recipientName}
                            onChange={e => setFormData(prev => ({ ...prev, recipientName: e.target.value }))}
                            style={inputStyle} placeholder="Enter exact citizen name" />
                    </div>

                    <div>
                        <label style={labelStyle}>Amount ({currencySymbol})</label>
                        <input type="number" required min="1" value={formData.amount}
                            onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            style={inputStyle} placeholder="0" />
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' as const }}
                            placeholder="Reason for subsidy..." rows={2} />
                    </div>

                    <div style={{ paddingTop: '8px' }}>
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{
                            width: '100%', padding: '14px', opacity: loading ? 0.5 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}>
                            {loading ? 'Issuing...' : 'Issue Subsidy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
