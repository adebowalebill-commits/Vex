'use client'

import { useState, useEffect } from 'react'

interface DeleteAccountModalProps {
    onConfirm: () => void
    onCancel: () => void
    deleting: boolean
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

export default function DeleteAccountModal({ onConfirm, onCancel, deleting }: DeleteAccountModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => { const t = setTimeout(() => setIsVisible(true), 10); return () => clearTimeout(t) }, [])
    const handleClose = () => { setIsVisible(false); setTimeout(onCancel, 200) }

    return (
        <div style={modalBg(isVisible)} onClick={handleClose}>
            <div style={modalPanel(isVisible)} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div className="modal-warning-icon" style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}>💀</div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Delete Account?</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        This will permanently delete your account and <strong style={{ color: 'var(--color-text-primary)' }}>all your worlds</strong>.
                    </p>
                </div>

                {/* Warning Box */}
                <div style={{
                    background: 'var(--color-error-bg)', border: '1px solid rgba(218,55,60,0.3)',
                    borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '24px', textAlign: 'left',
                }}>
                    <p style={{ color: 'var(--color-error)', fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                        ⚠️ This action is IRREVERSIBLE!
                    </p>
                    <ul style={{ color: 'var(--color-error)', fontSize: '14px', paddingLeft: '20px', margin: '0 0 12px' }}>
                        <li>All owned worlds will be destroyed</li>
                        <li>All citizenships will be revoked</li>
                        <li>All business ownerships will be lost</li>
                        <li>All transaction history will be wiped</li>
                    </ul>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: 'var(--color-error)' }}>
                            Type <strong>delete my account</strong> to confirm:
                        </label>
                        <input
                            type="text" value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="delete my account"
                            style={{
                                background: 'var(--color-bg-elevated)', border: '1px solid rgba(218,55,60,0.3)',
                                borderRadius: 'var(--radius-md)', padding: '10px 12px', color: 'var(--color-text-primary)',
                                width: '100%', fontSize: '16px', outline: 'none', minHeight: '44px',
                            }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={handleClose} disabled={deleting} className="btn btn-secondary"
                        style={{ flex: 1, padding: '14px', opacity: deleting ? 0.5 : 1 }}>
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm}
                        disabled={deleting || confirmText !== 'delete my account'}
                        className="btn btn-danger"
                        style={{ flex: 1, padding: '14px', opacity: (deleting || confirmText !== 'delete my account') ? 0.5 : 1, cursor: (deleting || confirmText !== 'delete my account') ? 'not-allowed' : 'pointer' }}>
                        {deleting ? '⏳ Deleting...' : '🗑️ Delete Everything'}
                    </button>
                </div>
            </div>
        </div>
    )
}
