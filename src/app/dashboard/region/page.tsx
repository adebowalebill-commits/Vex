'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface Region {
    id: string
    name: string
    description: string | null
    mayorName: string | null
    citizenCount: number
    businessCount: number
    isActive: boolean
    createdAt: string
}

interface World {
    id: string
    name: string
}

function RegionContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [regions, setRegions] = useState<Region[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ total: 0, active: 0, totalPopulation: 0 })

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
            fetchRegions()
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

    async function fetchRegions() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/regions`)
            const data = await res.json()
            if (data.success) {
                setRegions(data.data.regions)
                setStats(data.data.stats)
            }
        } catch (error) {
            console.error('Failed to fetch regions:', error)
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
            <DashboardLayout title="Regions">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to manage regions.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Regions">
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
                    <div className="text-gray-400 text-sm">Total Regions</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Active Regions</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">{stats.active}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Population</div>
                    <div className="text-2xl font-bold text-white mt-1">{stats.totalPopulation}</div>
                </div>
            </div>

            {/* Regions Grid */}
            {regions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regions.map(region => (
                        <div key={region.id} className="glass-card p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{region.name}</h3>
                                    <p className="text-gray-400 text-sm">
                                        {region.mayorName ? `Mayor: ${region.mayorName}` : 'No Mayor'}
                                    </p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${region.isActive
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                    {region.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass-card p-3">
                                    <div className="text-xl font-bold text-white">{region.citizenCount}</div>
                                    <div className="text-gray-400 text-xs">Citizens</div>
                                </div>
                                <div className="glass-card p-3">
                                    <div className="text-xl font-bold text-white">{region.businessCount}</div>
                                    <div className="text-gray-400 text-xs">Businesses</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">🗺️</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Regions Yet</h3>
                    <p className="text-gray-400 max-w-md mx-auto">
                        Regions will appear here once they are created for this world.
                    </p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function RegionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <RegionContent />
        </Suspense>
    )
}
