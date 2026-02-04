'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateWorldModal from '@/components/modals/CreateWorldModal'
import DeleteWorldModal from '@/components/modals/DeleteWorldModal'

interface World {
    id: string
    name: string
    description: string | null
    discordServerId: string
    currencyName: string
    currencySymbol: string
    citizenCount: number
    businessCount: number
    transactionCount?: number
    treasuryBalance?: number
    myBalance?: number
    isOwner: boolean
    createdAt: string
}

interface WorldsData {
    owned: World[]
    member: World[]
}

export default function WorldsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [worlds, setWorlds] = useState<WorldsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<World | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    useEffect(() => {
        if (session?.user) {
            fetchWorlds()
        }
    }, [session])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                setWorlds(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch worlds:', error)
        } finally {
            setLoading(false)
        }
    }

    function handleWorldCreated() {
        setShowCreateModal(false)
        fetchWorlds()
    }

    async function deleteWorld(world: World) {
        setDeleting(true)
        try {
            const res = await fetch(`/api/worlds/${world.id}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                setDeleteConfirm(null)
                fetchWorlds()
            } else {
                alert(data.error || 'Failed to delete world')
            }
        } catch (error) {
            console.error('Failed to delete world:', error)
            alert('Failed to delete world')
        } finally {
            setDeleting(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    const hasWorlds = worlds && (worlds.owned.length > 0 || worlds.member.length > 0)

    return (
        <DashboardLayout title="Worlds">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <p className="text-gray-400">Manage your Discord server economies</p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium hover:opacity-90 transition"
                >
                    + Create World
                </button>
            </div>

            {!hasWorlds ? (
                /* Empty State */
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🌍</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto mb-6">
                        Create your first world to start building an economy for your Discord server.
                        Each world has its own currency, citizens, and businesses.
                    </p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium hover:opacity-90 transition"
                    >
                        Create Your First World
                    </button>
                </div>
            ) : (
                <>
                    {/* Owned Worlds */}
                    {worlds.owned.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold text-white mb-4">Your Worlds</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {worlds.owned.map(world => (
                                    <div key={world.id} className="glass-card p-6 hover:border-purple-500/50 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{world.name}</h3>
                                                <p className="text-gray-400 text-sm">{world.description || 'No description'}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                                                Owner
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="text-gray-400 text-xs">Treasury</div>
                                                <div className="text-white font-medium">
                                                    {world.currencySymbol}{world.treasuryBalance?.toLocaleString() || '0'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs">Citizens</div>
                                                <div className="text-white font-medium">{world.citizenCount}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs">Businesses</div>
                                                <div className="text-white font-medium">{world.businessCount}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs">Transactions</div>
                                                <div className="text-white font-medium">{world.transactionCount || 0}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mb-3">
                                            <a
                                                href={`/dashboard/treasury?world=${world.id}`}
                                                className="flex-1 py-2 text-center bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
                                            >
                                                Treasury
                                            </a>
                                            <a
                                                href={`/dashboard/citizen?world=${world.id}`}
                                                className="flex-1 py-2 text-center bg-white/10 rounded-lg text-sm hover:bg-white/20 transition"
                                            >
                                                Citizens
                                            </a>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                console.log('Delete clicked for:', world.name)
                                                setDeleteConfirm(world)
                                            }}
                                            className="w-full py-2 text-center bg-red-500/10 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition cursor-pointer"
                                        >
                                            🗑️ Delete World
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Member Worlds */}
                    {worlds.member.length > 0 && (
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4">Member Of</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {worlds.member.map(world => (
                                    <div key={world.id} className="glass-card p-6 hover:border-purple-500/50 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{world.name}</h3>
                                                <p className="text-gray-400 text-sm">{world.description || 'No description'}</p>
                                            </div>
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                                Citizen
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="text-gray-400 text-xs">My Balance</div>
                                                <div className="text-white font-medium">
                                                    {world.currencySymbol}{world.myBalance?.toLocaleString() || '0'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400 text-xs">Citizens</div>
                                                <div className="text-white font-medium">{world.citizenCount}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Info Cards */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6">
                    <div className="text-3xl mb-3">🔗</div>
                    <h4 className="font-medium text-white mb-2">Connect Discord</h4>
                    <p className="text-gray-400 text-sm">Link your Discord server to create a world economy</p>
                </div>
                <div className="glass-card p-6">
                    <div className="text-3xl mb-3">⚙️</div>
                    <h4 className="font-medium text-white mb-2">Configure Economy</h4>
                    <p className="text-gray-400 text-sm">Set currency, tax rates, and initial balances</p>
                </div>
                <div className="glass-card p-6">
                    <div className="text-3xl mb-3">🚀</div>
                    <h4 className="font-medium text-white mb-2">Launch & Grow</h4>
                    <p className="text-gray-400 text-sm">Citizens join via Discord bot commands</p>
                </div>
            </div>

            {/* Create World Modal */}
            {showCreateModal && (
                <CreateWorldModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleWorldCreated}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <DeleteWorldModal
                    worldName={deleteConfirm.name}
                    citizenCount={deleteConfirm.citizenCount}
                    businessCount={deleteConfirm.businessCount}
                    transactionCount={deleteConfirm.transactionCount || 0}
                    treasuryBalance={deleteConfirm.treasuryBalance || 0}
                    currencySymbol={deleteConfirm.currencySymbol}
                    deleting={deleting}
                    onConfirm={() => deleteWorld(deleteConfirm)}
                    onCancel={() => setDeleteConfirm(null)}
                />
            )}
        </DashboardLayout>
    )
}
