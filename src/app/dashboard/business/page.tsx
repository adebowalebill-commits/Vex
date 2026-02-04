'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Business {
    id: string
    name: string
    type: string
    ownerName: string
    walletBalance: number
    bankBalance: number
    employeeCount: number
    isOperating: boolean
    createdAt: string
}

interface World {
    id: string
    name: string
}

function BusinessContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [businesses, setBusinesses] = useState<Business[]>([])
    const [currencySymbol, setCurrencySymbol] = useState('©')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, operating: 0, totalBalance: 0 })

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
            fetchBusinesses()
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

    async function fetchBusinesses() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/businesses`)
            const data = await res.json()
            if (data.success) {
                setBusinesses(data.data.businesses)
                setCurrencySymbol(data.data.currencySymbol)
                setStats(data.data.stats)
            }
        } catch (error) {
            console.error('Failed to fetch businesses:', error)
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
            <DashboardLayout title="Businesses">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🏢</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to manage businesses.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Businesses">
            {/* World Selector & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="glass-card p-4">
                    <label className="block text-sm text-gray-400 mb-2">Select World</label>
                    <select
                        value={selectedWorld}
                        onChange={e => setSelectedWorld(e.target.value)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        {worlds.map(w => (
                            <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Businesses</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Operating</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">{stats.operating}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Balance</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {currencySymbol}{stats.totalBalance.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Businesses List */}
            <div className="glass-card p-6">
                {businesses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10">
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Business</th>
                                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                                    <th className="text-right py-3 px-4 text-gray-400 font-medium">Balance</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Employees</th>
                                    <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {businesses.map(business => (
                                    <tr key={business.id} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="py-3 px-4">
                                            <div>
                                                <div className="text-white font-medium">{business.name}</div>
                                                <div className="text-gray-500 text-xs">Owner: {business.ownerName}</div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-300">{business.type}</td>
                                        <td className="py-3 px-4 text-right text-white font-medium">
                                            {currencySymbol}{(business.walletBalance + business.bankBalance).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-center text-white">{business.employeeCount}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs ${business.isOperating
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-yellow-500/20 text-yellow-400'
                                                }`}>
                                                {business.isOperating ? 'Operating' : 'Paused'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-6xl mb-4">🏢</div>
                        <h3 className="text-xl font-medium text-white mb-2">No Businesses Yet</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            Businesses will appear here once citizens create them via the Discord bot.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function BusinessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <BusinessContent />
        </Suspense>
    )
}
