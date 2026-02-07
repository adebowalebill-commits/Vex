'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface DashboardStats {
    totalBalance: number
    worldsOwned: number
    citizenships: number
    recentTransactions: number
}

export default function DashboardPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    useEffect(() => {
        if (session?.user) {
            fetchStats()
        }
    }, [session])

    async function fetchStats() {
        try {
            const res = await fetch('/api/dashboard/stats', { cache: 'no-cache' })
            const data = await res.json()
            if (data.success) {
                setStats(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error)
        } finally {
            setLoading(false)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <DashboardLayout title="Dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Stats Cards */}
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Total Balance</div>
                    <div className="text-3xl font-bold text-white">
                        ©{stats?.totalBalance?.toLocaleString() || '0.00'}
                    </div>
                    <div className="text-green-400 text-sm mt-2">Across all worlds</div>
                </div>

                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Worlds Owned</div>
                    <div className="text-3xl font-bold text-white">{stats?.worldsOwned || 0}</div>
                    <div className="text-gray-400 text-sm mt-2">
                        {stats?.worldsOwned === 0 ? 'Create your first world!' : 'Active economies'}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Citizenships</div>
                    <div className="text-3xl font-bold text-white">{stats?.citizenships || 0}</div>
                    <div className="text-gray-400 text-sm mt-2">World memberships</div>
                </div>

                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Transactions (24h)</div>
                    <div className="text-3xl font-bold text-white">{stats?.recentTransactions || 0}</div>
                    <div className="text-gray-400 text-sm mt-2">Recent activity</div>
                </div>
            </div>

            {/* Welcome Section */}
            <div className="glass-card p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Welcome, {session.user?.name}! 👋
                </h2>
                <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                    VexiumVerse is your economic operating system for Discord communities.
                    Create worlds, manage citizens, run businesses, and build thriving virtual economies.
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                    <a href="/dashboard/worlds" className="btn-primary">
                        {stats?.worldsOwned === 0 ? 'Create a World' : 'Manage Worlds'}
                    </a>
                    <a href="/dashboard/economy" className="btn-secondary">
                        View Economy
                    </a>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <a href="/dashboard/worlds" className="glass-card p-6 hover:border-purple-500/50 transition-colors cursor-pointer">
                    <div className="text-purple-400 text-2xl mb-3">🌍</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Worlds</h3>
                    <p className="text-gray-400 text-sm">
                        Create and manage your Discord server economies
                    </p>
                </a>

                <a href="/dashboard/business" className="glass-card p-6 hover:border-purple-500/50 transition-colors cursor-pointer">
                    <div className="text-purple-400 text-2xl mb-3">🏢</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Businesses</h3>
                    <p className="text-gray-400 text-sm">
                        Start businesses and hire citizens
                    </p>
                </a>

                <a href="/dashboard/treasury" className="glass-card p-6 hover:border-purple-500/50 transition-colors cursor-pointer">
                    <div className="text-purple-400 text-2xl mb-3">💰</div>
                    <h3 className="text-lg font-semibold text-white mb-2">Treasury</h3>
                    <p className="text-gray-400 text-sm">
                        Manage taxes and world funds
                    </p>
                </a>
            </div>
        </DashboardLayout>
    )
}
