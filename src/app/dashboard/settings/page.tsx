'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DeleteAccountModal from '@/components/modals/DeleteAccountModal'

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

    if (status === 'loading') {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    const handleDeleteAccount = async () => {
        setIsDeleting(true)
        try {
            const res = await fetch('/api/user/delete', { method: 'DELETE' })
            if (res.ok) window.location.href = '/'
            else { console.error('Failed to delete account'); setIsDeleting(false) }
        } catch (error) { console.error('Error deleting account:', error); setIsDeleting(false) }
    }

    return (
        <DashboardLayout title="Settings">
            <div style={{ maxWidth: '680px' }}>
                {/* Profile Section */}
                <div className="glass-card p-6" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Profile</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        {session?.user?.image && (
                            <img src={session.user.image} alt="Profile" style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--color-card-border)' }} />
                        )}
                        <div>
                            <div style={{ fontSize: '16px', fontWeight: 600 }}>{session?.user?.name}</div>
                            <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{session?.user?.email}</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Connected via Discord</div>
                </div>

                {/* Preferences */}
                <div className="glass-card p-6" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Preferences</h2>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {[
                            { label: 'Email Notifications', desc: 'Receive updates about your economies', defaultOn: false },
                            { label: 'Discord DM Alerts', desc: 'Get DMs for important transactions', defaultOn: true },
                        ].map((pref, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 0', borderBottom: i < 1 ? '1px solid var(--color-card-border)' : 'none',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 500 }}>{pref.label}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{pref.desc}</div>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input type="checkbox" defaultChecked={pref.defaultOn} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                                        className="toggle-input" />
                                    <div className="toggle-track" />
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6" style={{ border: '1px solid rgba(218,55,60,0.3)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-error)', marginBottom: '12px' }}>Danger Zone</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px', fontSize: '13px' }}>
                        These actions are irreversible. Please proceed with caution.
                    </p>
                    <button onClick={() => setIsDeleteModalOpen(true)} className="btn btn-ghost" style={{
                        border: '1px solid var(--color-error)', color: 'var(--color-error)',
                    }}>
                        Delete Account
                    </button>
                </div>
            </div>

            {isDeleteModalOpen && (
                <DeleteAccountModal onConfirm={handleDeleteAccount} onCancel={() => setIsDeleteModalOpen(false)} deleting={isDeleting} />
            )}
        </DashboardLayout>
    )
}
