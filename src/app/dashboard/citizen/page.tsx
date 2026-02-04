'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Citizen {
    id: string
    displayName: string
    discordId: string | null
    image: string | null
    walletBalance: number
    bankBalance: number
    totalBalance: number
    businessCount: number
    isActive: boolean
    createdAt: string
}

interface World {
    id: string
    name: string
}

function CitizenContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [citizens, setCitizens] = useState<Citizen[]>([])
    const [currencySymbol, setCurrencySymbol] = useState('©')
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 })

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
            fetchCitizens()
        }
    }, [selectedWorld, search, pagination.page])

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

    async function fetchCitizens() {
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: '20',
                ...(search && { search })
            })
            const res = await fetch(`/api/worlds/${selectedWorld}/citizens?${params}`)
            const data = await res.json()
            if (data.success) {
                setCitizens(data.data.citizens)
                setCurrencySymbol(data.data.currencySymbol)
                setPagination(prev => ({
                    ...prev,
                    total: data.data.pagination.total,
                    totalPages: data.data.pagination.totalPages
                }))
            }
        } catch (error) {
            console.error('Failed to fetch citizens:', error)
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
            <DashboardLayout title="Citizens">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to manage citizens.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Citizens">
            {/* World Selector & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="glass-card p-4">
                    <label className="block text-sm text-gray-400 mb-2">Select World</label>
                    <select
                        value={selectedWorld}
                        onChange={e => {
                            setSelectedWorld(e.target.value)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        {worlds.map(w => (
                            <option key={w.id} value={w.id} className="bg-gray-900">{w.name}</option>
                        ))}
                    </select>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Citizens</div>
                    <div className="text-2xl font-bold text-white mt-1">{pagination.total}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Active</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {citizens.filter(c => c.isActive).length}
                    </div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Avg Balance</div>
                    <div className="text-2xl font-bold text-white mt-1">
                        {currencySymbol}{citizens.length > 0
                            ? Math.round(citizens.reduce((sum, c) => sum + c.totalBalance, 0) / citizens.length).toLocaleString()
                            : '0'}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="glass-card p-4 mb-6">
                <input
                    type="text"
                    placeholder="Search citizens by name or Discord ID..."
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value)
                        setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400"
                />
            </div>

            {/* Citizens List */}
            <div className="glass-card p-6">
                {citizens.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Citizen</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Wallet</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Bank</th>
                                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Total</th>
                                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Businesses</th>
                                        <th className="text-center py-3 px-4 text-gray-400 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {citizens.map(citizen => (
                                        <tr key={citizen.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    {citizen.image ? (
                                                        <img src={citizen.image} alt="" className="w-8 h-8 rounded-full" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-purple-400">
                                                            {citizen.displayName[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-white font-medium">{citizen.displayName}</div>
                                                        {citizen.discordId && (
                                                            <div className="text-gray-500 text-xs">{citizen.discordId}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right text-white">
                                                {currencySymbol}{citizen.walletBalance.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-white">
                                                {currencySymbol}{citizen.bankBalance.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-white font-medium">
                                                {currencySymbol}{citizen.totalBalance.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-center text-white">
                                                {citizen.businessCount}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${citizen.isActive
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {citizen.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                                <div className="text-gray-400 text-sm">
                                    Showing {citizens.length} of {pagination.total} citizens
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1 bg-white/10 rounded text-white disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="px-3 py-1 text-white">
                                        Page {pagination.page} of {pagination.totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className="px-3 py-1 bg-white/10 rounded text-white disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 text-gray-400">
                        <div className="text-6xl mb-4">👥</div>
                        <h3 className="text-xl font-medium text-white mb-2">No Citizens Found</h3>
                        <p className="text-gray-400 max-w-md mx-auto">
                            {search
                                ? 'No citizens match your search criteria.'
                                : 'Citizens will appear here once they register via the Discord bot.'}
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default function CitizenPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <CitizenContent />
        </Suspense>
    )
}
