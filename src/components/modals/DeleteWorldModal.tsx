'use client'

import { useState, useEffect } from 'react'

interface DeleteWorldModalProps {
    worldName: string; citizenCount: number; businessCount: number
    transactionCount: number; treasuryBalance: number; currencySymbol: string
    deleting: boolean; onConfirm: () => void; onCancel: () => void
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
    borderRadius: 'var(--radius-2xl)', padding: '32px', width: '100%', maxWidth: '480px',
    textAlign: 'center',
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
    opacity: visible ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    boxShadow: 'var(--shadow-xl)',
})

export default function DeleteWorldModal({
    worldName, citizenCount, businessCount, transactionCount,
    treasuryBalance, currencySymbol, deleting, onConfirm, onCancel
}: DeleteWorldModalProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => { const t = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(t) }, [])
    const handleClose = () => { setIsVisible(false); setTimeout(onCancel, 200) }

    return (
        <div style={modalBg(isVisible)} onClick={handleClose}>
            <div style={modalPanel(isVisible)} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="modal-warning-icon" style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}>⚠️</div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Delete World?</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        Are you sure you want to delete <strong style={{ color: 'var(--color-text-primary)' }}>{worldName}</strong>?
                    </p>
                </div>

                {/* Warning Box */}
                <div style={{
                    background: 'var(--color-error-bg)', border: '1px solid rgba(218,55,60,0.3)',
                    borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '24px', textAlign: 'left',
                }}>
                    <p style={{ color: 'var(--color-error)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                        ⚠️ This action is permanent!
                    </p>
                    <p style={{ color: 'var(--color-error)', fontSize: '14px', marginBottom: '8px' }}>
                        All data will be deleted:
                    </p>
                    <ul style={{ color: 'var(--color-error)', fontSize: '14px', paddingLeft: '20px', margin: 0 }}>
                        <li>👥 {citizenCount} citizens</li>
                        <li>🏢 {businessCount} businesses</li>
                        <li>💸 {transactionCount} transactions</li>
                        <li>🏦 Treasury: <span style={{ fontFamily: 'var(--font-mono)' }}>{currencySymbol}{treasuryBalance.toLocaleString()}</span></li>
                    </ul>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={handleClose} disabled={deleting} className="btn btn-secondary"
                        style={{ flex: 1, padding: '14px', opacity: deleting ? 0.5 : 1 }}>
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={deleting} className="btn btn-danger"
                        style={{ flex: 1, padding: '14px', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
                        {deleting ? '⏳ Deleting...' : '🗑️ Delete Forever'}
                    </button>
                </div>
            </div>
        </div>
    )
}
