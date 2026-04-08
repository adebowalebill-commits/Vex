'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

interface InventoryItem {
    id: string; quantity: number
    resource: { name: string; category: string; baseValue: number }
    citizen?: { displayName: string }; business?: { name: string }
}
interface World { id: string; name: string }

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

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user) fetchWorlds() }, [session])
    useEffect(() => { if (selectedWorld) fetchInventory() }, [selectedWorld])

    async function fetchWorlds() {
        try {
            const res = await fetch('/api/worlds'); const data = await res.json()
            if (data.success) {
                const all = [...data.data.owned, ...data.data.member]; setWorlds(all)
                if (worldIdParam) setSelectedWorld(worldIdParam)
                else if (all.length > 0) setSelectedWorld(all[0].id)
            }
        } catch (error) { console.error('Failed to fetch worlds:', error) }
        finally { setLoading(false) }
    }

    async function fetchInventory() {
        try {
            const res = await fetch(`/api/worlds/${selectedWorld}/inventory`); const data = await res.json()
            if (data.success) setInventory(data.data)
        } catch (error) { console.error('Failed to fetch inventory:', error) }
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
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }

    if (worlds.length === 0) {
        return (
            <DashboardLayout title="Inventory">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Worlds Yet</h3>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>Create a world first to view inventory.</p>
                    <a href="/dashboard/worlds" className="btn btn-primary">Go to Worlds</a>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Inventory">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Select World</div>
                    <select value={selectedWorld} onChange={e => setSelectedWorld(e.target.value)} className="form-select" style={{ width: '100%' }}>
                        {worlds.map(w => <option key={w.id} value={w.id} style={{ background: 'var(--color-bg-elevated)' }}>{w.name}</option>)}
                    </select>
                </div>
                <div className="glass-card p-5">
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '6px' }}>Filter</div>
                    <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)} className="form-select" style={{ width: '100%' }}>
                        <option value="all" style={{ background: 'var(--color-bg-elevated)' }}>All</option>
                        <option value="citizen" style={{ background: 'var(--color-bg-elevated)' }}>Citizens</option>
                        <option value="business" style={{ background: 'var(--color-bg-elevated)' }}>Businesses</option>
                    </select>
                </div>
                {[
                    { label: 'Unique Resources', value: filtered.length },
                    { label: 'Total Units', value: totalItems.toLocaleString() },
                    { label: 'Total Value', value: totalValue.toLocaleString() },
                ].map((s, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px' }}>{s.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {Object.keys(categoryGroups).length > 0 ? (
                Object.entries(categoryGroups).map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block' }} />
                            {category.replace(/_/g, ' ')}
                            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 400 }}>({items.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(item => (
                                <div key={item.id} className="glass-card p-4">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{item.resource.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                {item.citizen ? `👤 ${item.citizen.displayName}` : `🏢 ${item.business?.name}`}
                                            </div>
                                        </div>
                                        <span className="badge badge-info">{item.quantity.toLocaleString()} units</span>
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                        Value: <span style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{(item.quantity * item.resource.baseValue).toLocaleString()}</span>
                                        <span style={{ marginLeft: '8px' }}>({item.resource.baseValue}/unit)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            ) : (
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Inventory</h3>
                    <p style={{ color: 'var(--color-text-secondary)' }}>Resources will appear here once citizens and businesses have inventory.</p>
                </div>
            )}
        </DashboardLayout>
    )
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>}>
            <InventoryContent />
        </Suspense>
    )
}
