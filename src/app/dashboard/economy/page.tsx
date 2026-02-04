'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface EconomyStats {
    moneySupply: number
    treasuryBalance: number
    dailyVolume: number
    citizenCount: number
    businessCount: number
    employmentCount: number
    currencySymbol: string
}

interface World {
    id: string
    name: string
}

function EconomyContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [economyStats, setEconomyStats] = useState<EconomyStats | null>(null)
    const [loading, setLoading] = useState(true)

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

    useEffect(() => {
        if (selectedWorld) {
            fetchEconomyStats()
        }
    }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const allWorlds = [...data.data.owned, ...data.data.member]
                setWorlds(allWorlds)
                if (worldIdParam) {
                    setSelectedWorld(worldIdParam)
                } else if (allWorlds.length > 0) {
                    setSelectedWorld(allWorlds[0].id)
                }
            }
        } catch (error) {
            console.error('Failed to fetch worlds:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchEconomyStats() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/economy`)
            const data = await res.json()
            if (data.success) {
                setEconomyStats(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch economy stats:', error)
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Economy">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to view economy stats.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    const symbol = economyStats?.currencySymbol || '©'

    return (
        <DashboardLayout title="Economy">
            {/* World Selector */}
            <div className="mb-6">
                <select
                    value={selectedWorld}
                    onChange={e => setSelectedWorld(e.target.value)}
                    className="p-3 bg-white/10 border border-white/20 rounded-lg text-white min-w-[200px]"
                >
                    {worlds.map(w => (
                        <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Money Supply</div>
                    <div className="text-3xl font-bold text-white">
                        {symbol}{(economyStats?.moneySupply || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Total currency in circulation</div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Treasury Balance</div>
                    <div className="text-3xl font-bold text-blue-400">
                        {symbol}{(economyStats?.treasuryBalance || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Government funds</div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Daily Volume</div>
                    <div className="text-3xl font-bold text-green-400">
                        {symbol}{(economyStats?.dailyVolume || 0).toLocaleString()}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Transactions today</div>
                </div>
                <div className="glass-card p-6">
                    <div className="text-gray-400 text-sm mb-1">Citizens</div>
                    <div className="text-3xl font-bold text-purple-400">
                        {economyStats?.citizenCount || 0}
                    </div>
                    <div className="text-gray-500 text-xs mt-2">Registered population</div>
                </div>
            </div>

            {/* Economic Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Population & Production</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-4 text-center">
                            <div className="text-3xl font-bold text-white">{economyStats?.citizenCount || 0}</div>
                            <div className="text-gray-400 text-sm">Total Citizens</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-3xl font-bold text-green-400">{economyStats?.businessCount || 0}</div>
                            <div className="text-gray-400 text-sm">Active Businesses</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-3xl font-bold text-blue-400">{economyStats?.employmentCount || 0}</div>
                            <div className="text-gray-400 text-sm">Employed Citizens</div>
                        </div>
                        <div className="glass-card p-4 text-center">
                            <div className="text-3xl font-bold text-yellow-400">
                                {economyStats?.citizenCount && economyStats.citizenCount > 0
                                    ? Math.round((economyStats.employmentCount / economyStats.citizenCount) * 100)
                                    : 0}%
                            </div>
                            <div className="text-gray-400 text-sm">Employment Rate</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
                    <div className="space-y-3">
                        <a href={`/dashboard/treasury?world=${selectedWorld}`} className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                            <div className="font-medium text-white">🏦 Treasury</div>
                            <div className="text-sm text-gray-400">Manage taxes and subsidies</div>
                        </a>
                        <a href={`/dashboard/transactions?world=${selectedWorld}`} className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                            <div className="font-medium text-white">💸 Transactions</div>
                            <div className="text-sm text-gray-400">View transaction history</div>
                        </a>
                        <a href={`/dashboard/citizen?world=${selectedWorld}`} className="block p-4 bg-white/5 rounded-lg hover:bg-white/10 transition">
                            <div className="font-medium text-white">👥 Citizens</div>
                            <div className="text-sm text-gray-400">Manage citizen records</div>
                        </a>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}

export default function EconomyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <EconomyContent />
        </Suspense>
    )
}
