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
                    maxWidth: '500px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
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
                        <span style={{ fontSize: '24px' }}>🌍</span>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'white' }}>Create New World</h2>
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
                        <label style={labelStyle}>World Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            style={inputStyle}
                            placeholder="My Awesome Economy"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                            placeholder="A thriving virtual economy..."
                            rows={2}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Discord Server ID *</label>
                        <input
                            type="text"
                            required
                            value={formData.discordServerId}
                            onChange={e => setFormData(prev => ({ ...prev, discordServerId: e.target.value }))}
                            style={inputStyle}
                            placeholder="123456789012345678"
                        />
                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                            Right-click server → Copy Server ID (Developer Mode)
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={labelStyle}>Currency Name</label>
                            <input
                                type="text"
                                value={formData.currencyName}
                                onChange={e => setFormData(prev => ({ ...prev, currencyName: e.target.value }))}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Symbol</label>
                            <input
                                type="text"
                                value={formData.currencySymbol}
                                onChange={e => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                                style={{ ...inputStyle, textAlign: 'center' }}
                                maxLength={3}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Tax Rates (%)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Sales</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.salesTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, salesTaxRate: Number(e.target.value) }))}
                                    style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Income</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.incomeTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, incomeTaxRate: Number(e.target.value) }))}
                                    style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Property</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={formData.propertyTaxRate}
                                    onChange={e => setFormData(prev => ({ ...prev, propertyTaxRate: Number(e.target.value) }))}
                                    style={{ ...inputStyle, padding: '8px', textAlign: 'center' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Starting Balance</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.initialCitizenBalance}
                            onChange={e => setFormData(prev => ({ ...prev, initialCitizenBalance: Number(e.target.value) }))}
                            style={inputStyle}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: '500',
                                fontSize: '15px',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1,
                                padding: '14px',
                                background: 'linear-gradient(to right, #9333ea, #2563eb)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '15px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.5 : 1,
                                boxShadow: '0 4px 20px rgba(168, 85, 247, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? 'Creating...' : 'Create World'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
