'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface CitizenDetail {
    citizen: {
        id: string; displayName: string; walletBalance: number; bankBalance: number
        totalBalance: number; hasPassport: boolean; isActive: boolean; createdAt: string
        user: { id: string; name: string | null; image: string | null; discordId: string | null }
    }
    world: { id: string; name: string; currencySymbol: string }
    survivalNeeds: { food: number; water: number; sleep: number; lastDecayAt: string } | null
    businesses: { id: string; name: string; type: string; walletBalance: number; isOperating: boolean; employeeCount: number }[]
    employment: { id: string; businessId: string; businessName: string; businessType: string; position: string; hourlyWage: number; hoursWorked: number; hiredAt: string }[]
    inventory: { resourceId: string; resourceName: string; category: string; quantity: number; unitValue: number; totalValue: number }[]
    financials: { income7d: number; spending7d: number; net7d: number }
    transactions: {
        id: string; amount: number; type: string; description: string | null
        taxAmount: number; status: string; createdAt: string
        senderCitizen: { displayName: string } | null; senderBusiness: { name: string } | null
        receiverCitizen: { displayName: string } | null; receiverBusiness: { name: string } | null
    }[]
}

function NeedBar({ label, value, icon }: { label: string; value: number; icon: string }) {
    const pct = Math.max(0, Math.min(100, value))
    const color = pct > 60 ? 'var(--color-success)' : pct > 30 ? 'var(--color-warning)' : 'var(--color-error)'
    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{icon} {label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
            </div>
            <div style={{ height: '8px', background: 'var(--color-bg-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
            </div>
        </div>
    )
}

export default function CitizenDetailPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const citizenId = params.citizenId as string
    const [data, setData] = useState<CitizenDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user && citizenId) fetchCitizen() }, [session, citizenId])

    async function fetchCitizen() {
        try {
            const res = await fetch(`/api/citizens/${citizenId}`)
            const json = await res.json()
            if (json.success) setData(json.data)
            else setError(json.error || 'Failed to load')
        } catch { setError('Failed to load citizen') }
        finally { setLoading(false) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }
    if (error || !data) {
        return (
            <DashboardLayout title="Citizen">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                    <p style={{ color: 'var(--color-error)' }}>{error || 'Citizen not found'}</p>
                    <Link href="/dashboard/citizen" className="btn btn-secondary" style={{ marginTop: '16px' }}>← Back</Link>
                </div>
            </DashboardLayout>
        )
    }

    const { citizen, world, survivalNeeds, businesses, employment, inventory, financials, transactions } = data
    const cs = world.currencySymbol

    return (
        <DashboardLayout title={citizen.displayName}>
            {/* Profile Header */}
            <div className="glass-card p-6 mb-6" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                {citizen.user.image && (
                    <img src={citizen.user.image} alt={citizen.displayName} style={{
                        width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--color-card-border)',
                    }} />
                )}
                <div style={{ flex: 1, minWidth: '180px' }}>
                    <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{citizen.displayName}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                        <span>{world.name}</span>
                        <span>Joined {new Date(citizen.createdAt).toLocaleDateString()}</span>
                        {citizen.hasPassport && <span style={{ color: 'var(--color-success)' }}>🛂 Passport</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{
                        fontSize: '12px', padding: '6px 12px', borderRadius: '20px',
                        background: citizen.isActive ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        color: citizen.isActive ? 'var(--color-success)' : 'var(--color-error)',
                    }}>
                        {citizen.isActive ? '● Active' : '● Inactive'}
                    </span>
                </div>
            </div>

            {/* Financial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {[
                    { label: 'Wallet', value: `${cs}${citizen.walletBalance.toLocaleString()}`, icon: '💰' },
                    { label: 'Bank', value: `${cs}${citizen.bankBalance.toLocaleString()}`, icon: '🏦' },
                    { label: 'Income (7d)', value: `${cs}${financials.income7d.toLocaleString()}`, icon: '📈' },
                    { label: 'Spending (7d)', value: `${cs}${financials.spending7d.toLocaleString()}`, icon: '📉' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-5">
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{stat.icon} {stat.label}</div>
                        <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Survival Needs */}
                <div className="glass-card p-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>❤️ Survival Needs</h3>
                    {survivalNeeds ? (
                        <>
                            <NeedBar label="Food" value={survivalNeeds.food} icon="🍖" />
                            <NeedBar label="Water" value={survivalNeeds.water} icon="💧" />
                            <NeedBar label="Sleep" value={survivalNeeds.sleep} icon="😴" />
                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                                Last decay: {new Date(survivalNeeds.lastDecayAt).toLocaleString()}
                            </p>
                        </>
                    ) : (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>Survival needs not initialized.</p>
                    )}
                </div>

                {/* Employment */}
                <div className="glass-card p-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>💼 Employment</h3>
                    {employment.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>Not employed anywhere.</p>
                    ) : employment.map(emp => (
                        <div key={emp.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <Link href={`/dashboard/business/${emp.businessId}`} style={{ fontWeight: 500, color: 'var(--color-accent)', textDecoration: 'none' }}>{emp.businessName}</Link>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{cs}{emp.hourlyWage}/hr</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                {emp.position} • {emp.hoursWorked.toFixed(1)}h worked
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Owned Businesses */}
            {businesses.length > 0 && (
                <div className="glass-card p-6 mb-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🏢 Owned Businesses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {businesses.map(biz => (
                            <Link key={biz.id} href={`/dashboard/business/${biz.id}`}
                                className="glass-card glow-border p-4" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 600 }}>{biz.name}</span>
                                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '8px', background: biz.isOperating ? 'var(--color-success-bg)' : 'var(--color-error-bg)', color: biz.isOperating ? 'var(--color-success)' : 'var(--color-error)' }}>
                                        {biz.isOperating ? 'Online' : 'Offline'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{biz.type.replace(/_/g, ' ')}</div>
                                <div style={{ fontSize: '18px', fontFamily: 'var(--font-mono)', color: 'var(--color-data)', marginTop: '8px' }}>{cs}{biz.walletBalance.toLocaleString()}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{biz.employeeCount} employees</div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventory */}
            {inventory.length > 0 && (
                <div className="glass-card p-6 mb-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📦 Inventory</h3>
                    <div className="table-scroll-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                    {['Resource', 'Category', 'Qty', 'Value'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map(item => (
                                    <tr key={item.resourceId} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.resourceName}</td>
                                        <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{item.category.replace('_', ' ')}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{item.quantity}</td>
                                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{cs}{item.totalValue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Transactions */}
            <div className="glass-card p-6">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>💸 Transaction History</h3>
                {transactions.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>No transactions yet.</p>
                ) : (
                    <div className="table-scroll-container">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                    {['Type', 'Amount', 'From', 'To', 'Date'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map(tx => {
                                    const isIncoming = tx.receiverCitizen?.displayName === citizen.displayName
                                    return (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)', color: 'var(--color-accent)' }}>{tx.type}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: isIncoming ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                                                {isIncoming ? '+' : '-'}{cs}{tx.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{tx.senderCitizen?.displayName || tx.senderBusiness?.name || 'Treasury'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{tx.receiverCitizen?.displayName || tx.receiverBusiness?.name || 'Treasury'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}
