'use client'

import { useState, useEffect } from 'react'

interface DeleteAccountModalProps {
    deleting: boolean
    onConfirm: () => void
    onCancel: () => void
}

export default function DeleteAccountModal({
    deleting,
    onConfirm,
    onCancel
}: DeleteAccountModalProps) {
    const [isVisible, setIsVisible] = useState(false)

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
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/60 backdrop-blur-md opacity-100' : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'}`}
            onClick={handleClose}
        >
            <div
                className={`w-full max-w-md bg-[#14141e]/95 border border-white/10 rounded-2xl p-6 shadow-2xl modal-content ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-4 inline-block modal-warning-icon">
                        ⚠️
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                        Delete Account?
                    </h3>
                    <p className="text-gray-400">
                        Are you sure you want to delete your account? This action cannot be undone.
                    </p>
                </div>

                {/* Warning Box */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                    <p className="text-red-400 text-sm font-semibold mb-2">
                        ⚠️ This action is permanent!
                    </p>
                    <p className="text-red-400 text-sm mb-2">
                        You will lose access to:
                    </p>
                    <ul className="text-red-400 text-sm space-y-1 list-disc list-inside">
                        <li>🌎 All created worlds</li>
                        <li>👥 All citizenships</li>
                        <li>💰 All assets and balances</li>
                        <li>📊 All transaction history</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={deleting}
                        className="flex-1 py-3.5 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-all hover:scale-105 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={deleting}
                        className="flex-1 py-3.5 bg-red-600 rounded-xl text-white font-semibold shadow-lg shadow-glow-red hover:bg-red-700 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {deleting ? '⏳ Deleting...' : '🗑️ Delete Account'}
                    </button>
                </div>
            </div>
        </div>
    )
}
