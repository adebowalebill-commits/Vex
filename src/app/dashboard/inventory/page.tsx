'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface InventoryItem {
    id: string
    quantity: number
    resource: {
        name: string
        category: string
        baseValue: number
    }
    citizen?: { displayName: string }
    business?: { name: string }
}

interface World {
    id: string
    name: string
}

function InventoryContent() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const searchParams = useSearchParams()
    const worldIdParam = searchParams.get('world')

    const [worlds, setWorlds] = useState<World[]>([])
    const [selectedWorld, setSelectedWorld] = useState<string>('')
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'citizen' | 'business'>('all')

    useEffect(() => {
        if (status === 'unauthenticated') router.push('/login')
    }, [status, router])

    useEffect(() => {
        if (session?.user) fetchWorlds()
    }, [session])

    useEffect(() => {
        if (selectedWorld) fetchInventory()
    }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds')
            const data = await res.json()
            if (data.success) {
                const all = [...data.data.owned, ...data.data.member]
                setWorlds(all)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (all.length > 0) setSelectedWorld(all[0].id)
            }
        } catch (error) {
            console.error('Failed to fetch worlds:', error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchInventory() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/inventory`)
            const data = await res.json()
            if (data.success) setInventory(data.data)
        } catch (error) {
            console.error('Failed to fetch inventory:', error)
        }
    }

    const filtered = inventory.filter(item => {
        if (filter === 'citizen') return !!item.citizen
        if (filter === 'business') return !!item.business
        return true
    })

    const totalValue = filtered.reduce((sum, item) => sum + item.quantity * item.resource.baseValue, 0)
    const totalItems = filtered.reduce((sum, item) => sum + item.quantity, 0)

    const categoryGroups = filtered.reduce((acc, item) => {
        const cat = item.resource.category
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {} as Record<string, InventoryItem[]>)

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Inventory">
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Worlds Yet</h3>
                    <p className="text-gray-400 mb-6">Create a world first to view inventory.</p>
                    <a href="/dashboard/worlds" className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg text-white font-medium">
                        Go to Worlds
                    </a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Inventory">
            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                    <label className="block text-sm text-gray-400 mb-2">Filter</label>
                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value as typeof filter)}
                        className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white"
                    >
                        <option value="all" className="bg-gray-900">All</option>
                        <option value="citizen" className="bg-gray-900">Citizens</option>
                        <option value="business" className="bg-gray-900">Businesses</option>
                    </select>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Unique Resources</div>
                    <div className="text-2xl font-bold text-white mt-1">{filtered.length}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Units</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">{totalItems.toLocaleString()}</div>
                </div>
                <div className="glass-card p-4">
                    <div className="text-gray-400 text-sm">Total Value</div>
                    <div className="text-2xl font-bold text-green-400 mt-1">{totalValue.toLocaleString()}</div>
                </div>
            </div>

            {/* Inventory by Category */}
            {Object.keys(categoryGroups).length > 0 ? (
                Object.entries(categoryGroups).map(([category, items]) => (
                    <div key={category} className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            {category.replace(/_/g, ' ')}
                            <span className="text-sm text-gray-400 font-normal">({items.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(item => (
                                <div key={item.id} className="glass-card p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-white font-medium">{item.resource.name}</div>
                                            <div className="text-gray-400 text-sm">
                                                {item.citizen ? `👤 ${item.citizen.displayName}` : `🏢 ${item.business?.name}`}
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                                            {item.quantity.toLocaleString()} units
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-400">
                                        Value: <span className="text-green-400">{(item.quantity * item.resource.baseValue).toLocaleString()}</span>
                                        <span className="ml-2">({item.resource.baseValue}/unit)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="glass-card p-8 text-center">
                    <div className="text-6xl mb-4">📦</div>
                    <h3 className="text-xl font-medium text-white mb-2">No Inventory</h3>
                    <p className="text-gray-400">Resources will appear here once citizens and businesses have inventory.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function InventoryPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        }>
            <InventoryContent />
        </Suspense>
    )
}
