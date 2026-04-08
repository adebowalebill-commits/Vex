'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateWorldModal from '@/components/modals/CreateWorldModal'
import DeleteWorldModal from '@/components/modals/DeleteWorldModal'

interface World {
    id: string; name: string; description: string | null; discordServerId: string
    currencyName: string; currencySymbol: string; citizenCount: number; businessCount: number
    transactionCount?: number; treasuryBalance?: number; myBalance?: number
    isOwner: boolean; createdAt: string
}
interface WorldsData { owned: World[]; member: World[] }

export default function WorldsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [worlds, setWorlds] = useState<WorldsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<World | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds', { cache: 'no-cache' }); const data = await res.json()
            if (data.success) setWorlds(data.data)
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    function handleWorldCreated() { setShowCreateModal(false); fetchWorlds() }

    async function deleteWorld(world: World) {
        setDeleting(true)
        try {
            const res = await fetch(`/api/worlds/${world.id}`, { method: 'DELETE' }); const data = await res.json()
            if (data.success) { setDeleteConfirm(null); fetchWorlds() }
            else alert(data.error || 'Failed to delete world')
        } catch (error) { console.error('Failed to delete world:', error); alert('Failed to delete world') }
        finally { setDeleting(false) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    const hasWorlds = worlds && (worlds.owned.length > 0 || worlds.member.length > 0)

    return (
        <DashboardLayout title="Worlds">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <p style={{ color: 'var(--color-text-secondary)' }}>Manage your Discord server economies</p>
                <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">+ Create World</button>
            </div>

            {!hasWorlds ? (
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌍</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto 24px' }}>
                        Create your first world to start building an economy for your Discord server. Each world has its own currency, citizens, and businesses.
                    </p>
                    <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">Create Your First World</button>
                </div>
            ) : (
                <>
                    {worlds!.owned.length > 0 && (
                        <div style={{ marginBottom: '32px' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Your Worlds</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {worlds!.owned.map(world => (
                                    <div key={world.id} className="glass-card glow-border p-6">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{world.name}</h3>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{world.description || 'No description'}</p>
                                            </div>
                                            <span className="badge badge-info">Owner</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
                                            {[
                                                { label: 'Treasury', value: `${world.currencySymbol}${world.treasuryBalance?.toLocaleString() || '0'}` },
                                                { label: 'Citizens', value: world.citizenCount },
                                                { label: 'Businesses', value: world.businessCount },
                                                { label: 'Transactions', value: world.transactionCount || 0 },
                                            ].map((s, i) => (
                                                <div key={i}>
                                                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
                                                    <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <a href={`/dashboard/treasury?world=${world.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Treasury</a>
                                            <a href={`/dashboard/citizen?world=${world.id}`} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>Citizens</a>
                                        </div>
                                        <button type="button" onClick={() => setDeleteConfirm(world)} className="btn btn-ghost btn-sm" style={{ width: '100%', color: 'var(--color-error)' }}>
                                            🗑️ Delete World
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {worlds!.member.length > 0 && (
                        <div>
                            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Member Of</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {worlds!.member.map(world => (
                                    <div key={world.id} className="glass-card glow-border p-6">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                            <div>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600 }}>{world.name}</h3>
                                                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{world.description || 'No description'}</p>
                                            </div>
                                            <span className="badge badge-success">Citizen</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Balance</div>
                                                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{world.currencySymbol}{world.myBalance?.toLocaleString() || '0'}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Citizens</div>
                                                <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{world.citizenCount}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginTop: '32px' }}>
                {[
                    { icon: '🔗', title: 'Connect Discord', desc: 'Link your Discord server to create a world economy' },
                    { icon: '⚙️', title: 'Configure Economy', desc: 'Set currency, tax rates, and initial balances' },
                    { icon: '🚀', title: 'Launch & Grow', desc: 'Citizens join via Discord bot commands' },
                ].map((card, i) => (
                    <div key={i} className="glass-card glow-border p-6">
                        <div style={{ fontSize: '1.75rem', marginBottom: '12px' }}>{card.icon}</div>
                        <h4 style={{ fontWeight: 600, marginBottom: '6px' }}>{card.title}</h4>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{card.desc}</p>
                    </div>
                ))}
            </div>

            {showCreateModal && <CreateWorldModal onClose={() => setShowCreateModal(false)} onSuccess={handleWorldCreated} />}
            {deleteConfirm && (
                <DeleteWorldModal worldName={deleteConfirm.name} citizenCount={deleteConfirm.citizenCount} businessCount={deleteConfirm.businessCount}
                    transactionCount={deleteConfirm.transactionCount || 0} treasuryBalance={deleteConfirm.treasuryBalance || 0}
                    currencySymbol={deleteConfirm.currencySymbol} deleting={deleting}
                    onConfirm={() => deleteWorld(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />
            )}
        </DashboardLayout>
    )
}
