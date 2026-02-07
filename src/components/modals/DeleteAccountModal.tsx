'use client'

import { useState, useEffect } from 'react'

interface DeleteAccountModalProps {
    onConfirm: () => void
    onCancel: () => void
    deleting: boolean
}

export default function DeleteAccountModal({
    onConfirm,
    onCancel,
    deleting
}: DeleteAccountModalProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    useEffect(() => {
        // Small delay to trigger CSS transition
        const timer = setTimeout(() => {
            setIsVisible(true)
        }, 10)
        return () => clearTimeout(timer)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onCancel, 200)
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
                    padding: '32px',
                    width: '100%',
                    maxWidth: '480px',
                    textAlign: 'center',
                    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block', animation: 'bounce 1s infinite' }}>
                        💀
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>
                        Delete Account?
                    </h3>
                    <p style={{ color: '#9ca3af' }}>
                        This will permanently delete your account and <strong style={{ color: 'white' }}>all your worlds</strong>.
                    </p>
                </div>

                {/* Warning Box */}
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                    textAlign: 'left'
                }}>
                    <p style={{ color: '#f87171', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        ⚠️ This action is IRREVERSIBLE!
                    </p>
                    <ul style={{ color: '#f87171', fontSize: '14px', paddingLeft: '20px', margin: 0, marginBottom: '12px' }}>
                        <li>All owned worlds will be destroyed</li>
                        <li>All citizenships will be revoked</li>
                        <li>All business ownerships will be lost</li>
                        <li>All transaction history will be wiped</li>
                    </ul>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '12px', color: '#f87171' }}>
                            Type <strong>delete my account</strong> to confirm:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="delete my account"
                            style={{
                                background: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#fff',
                                width: '100%',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: '500',
                            fontSize: '15px',
                            cursor: 'pointer',
                            opacity: deleting ? 0.5 : 1,
                            transition: 'background 0.2s'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting || confirmText !== 'delete my account'}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: '#dc2626',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '15px',
                            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                            cursor: (deleting || confirmText !== 'delete my account') ? 'not-allowed' : 'pointer',
                            opacity: (deleting || confirmText !== 'delete my account') ? 0.5 : 1,
                            transition: 'background 0.2s'
                        }}
                    >
                        {deleting ? '⏳ Deleting...' : '🗑️ Delete Everything'}
                    </button>
                </div>
            </div>
        </div>
    )
}
