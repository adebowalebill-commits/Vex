'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Link from 'next/link'

interface BusinessDetail {
    business: {
        id: string; name: string; description: string | null; type: string
        operatingCost: number; productionCapacity: number; walletBalance: number
        isActive: boolean; isOperating: boolean; createdAt: string
        owner: { id: string; displayName: string }
        region: { id: string; name: string }
    }
    world: { id: string; name: string; currencySymbol: string }
    employees: { id: string; citizenId: string; citizenName: string; position: string; hourlyWage: number; hoursWorked: number; hiredAt: string }[]
    inventory: { resourceId: string; resourceName: string; category: string; quantity: number; unitValue: number; totalValue: number }[]
    production: {
        inputs: { resourceName: string; category: string; quantityRequired: number }[]
        outputs: { resourceName: string; category: string; quantityProduced: number }[]
        capacity: number
    }
    financials: { revenue7d: number; expenses7d: number; profit7d: number; payrollDue: number; inventoryValue: number; walletBalance: number }
    transactions: {
        id: string; amount: number; type: string; description: string | null
        taxAmount: number; status: string; createdAt: string
        senderCitizen: { displayName: string } | null; senderBusiness: { name: string } | null
        receiverCitizen: { displayName: string } | null; receiverBusiness: { name: string } | null
    }[]
}

const typeLabels: Record<string, string> = {
    WATER_PURIFICATION: '💧 Water Purification', FARM: '🌾 Farm', GROCERY_STORE: '🏪 Grocery Store',
    MINING: '⛏️ Mining', OIL_DRILLING: '🛢️ Oil Drilling', LOGGING: '🪵 Logging',
    OIL_REFINERY: '🏭 Oil Refinery', STEEL_MILL: '⚙️ Steel Mill', MACHINERY_MANUFACTURING: '🔧 Machinery',
    FOOD_PROCESSING: '🥫 Food Processing', TRUCKING_COMPANY: '🚛 Trucking', VEHICLE_DEALERSHIP: '🚗 Vehicles',
    GAS_STATION: '⛽ Gas Station', BUSINESS_CONSTRUCTION: '🏗️ Construction', REAL_ESTATE_CONSTRUCTION: '🏠 Real Estate',
}

export default function BusinessDetailPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const params = useParams()
    const businessId = params.businessId as string
    const [data, setData] = useState<BusinessDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'overview' | 'workers' | 'inventory' | 'production' | 'transactions'>('overview')

    useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])
    useEffect(() => { if (session?.user && businessId) fetchBusiness() }, [session, businessId])

    async function fetchBusiness() {
        try {
            const res = await fetch(`/api/businesses/${businessId}`)
            const json = await res.json()
            if (json.success) setData(json.data)
            else setError(json.error || 'Failed to load')
        } catch { setError('Failed to load business') }
        finally { setLoading(false) }
    }

    if (status === 'loading' || loading) {
        return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-primary)' }}><div className="loading-spinner" /></div>
    }
    if (error || !data) {
        return (
            <DashboardLayout title="Business">
                <div className="glass-card p-8" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                    <p style={{ color: 'var(--color-error)' }}>{error || 'Business not found'}</p>
                    <Link href="/dashboard/business" className="btn btn-secondary" style={{ marginTop: '16px' }}>← Back</Link>
                </div>
            </DashboardLayout>
        )
    }

    const { business, world, employees, inventory, production, financials, transactions } = data
    const cs = world.currencySymbol

    const tabs = [
        { key: 'overview' as const, label: '📊 Overview' },
        { key: 'workers' as const, label: `👥 Workers (${employees.length})` },
        { key: 'inventory' as const, label: `📦 Inventory (${inventory.length})` },
        { key: 'production' as const, label: '⚙️ Production' },
        { key: 'transactions' as const, label: `💸 Transactions (${transactions.length})` },
    ]

    return (
        <DashboardLayout title={business.name}>
            {/* Header */}
            <div className="glass-card p-6 mb-6" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '28px' }}>{typeLabels[business.type]?.split(' ')[0] || '🏢'}</span>
                        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>{business.name}</h1>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        <span>Type: <strong style={{ color: 'var(--color-accent)' }}>{typeLabels[business.type] || business.type}</strong></span>
                        <span>Region: <strong>{business.region.name}</strong></span>
                        <span>Owner: <strong>{business.owner.displayName}</strong></span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <span className="btn btn-secondary" style={{
                        fontSize: '12px', padding: '6px 12px',
                        background: business.isOperating ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                        color: business.isOperating ? 'var(--color-success)' : 'var(--color-error)',
                        border: 'none',
                    }}>
                        {business.isOperating ? '● Operating' : '● Offline'}
                    </span>
                </div>
            </div>

            {/* Tab Nav */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={activeTab === tab.key ? 'btn btn-primary' : 'btn btn-secondary'}
                        style={{ fontSize: '13px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        {[
                            { label: 'Wallet Balance', value: `${cs}${financials.walletBalance.toLocaleString()}`, icon: '💰' },
                            { label: 'Revenue (7d)', value: `${cs}${financials.revenue7d.toLocaleString()}`, icon: '📈' },
                            { label: 'Expenses (7d)', value: `${cs}${financials.expenses7d.toLocaleString()}`, icon: '📉' },
                            { label: 'Net Profit (7d)', value: `${cs}${financials.profit7d.toLocaleString()}`, icon: financials.profit7d >= 0 ? '✅' : '🔻' },
                        ].map((stat, i) => (
                            <div key={i} className="glass-card p-5">
                                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{stat.icon} {stat.label}</div>
                                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{stat.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-6">
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>📋 P&L Summary</h3>
                            {[
                                { label: 'Revenue (7d)', value: financials.revenue7d, color: 'var(--color-success)' },
                                { label: 'Expenses (7d)', value: -financials.expenses7d, color: 'var(--color-error)' },
                                { label: 'Daily Operating Cost', value: -business.operatingCost, color: 'var(--color-warning)' },
                                { label: 'Daily Payroll', value: -financials.payrollDue, color: 'var(--color-warning)' },
                                { label: 'Inventory Value', value: financials.inventoryValue, color: 'var(--color-data)' },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{row.label}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)', color: row.color, fontWeight: 500 }}>{cs}{row.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="glass-card p-6">
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>ℹ️ Details</h3>
                            {[
                                { label: 'Business Type', value: typeLabels[business.type] || business.type },
                                { label: 'Region', value: business.region.name },
                                { label: 'Owner', value: business.owner.displayName },
                                { label: 'Employees', value: employees.length.toString() },
                                { label: 'Production Capacity', value: `${business.productionCapacity} units/cycle` },
                                { label: 'Created', value: new Date(business.createdAt).toLocaleDateString() },
                            ].map((row, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>{row.label}</span>
                                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Workers Tab */}
            {activeTab === 'workers' && (
                <div className="glass-card p-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>👥 Employees</h3>
                    {employees.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>No employees yet.</p>
                    ) : (
                        <div className="table-scroll-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                        {['Name', 'Position', 'Hourly Wage', 'Hours Worked', 'Hired'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                            <td style={{ padding: '10px 12px', fontSize: '14px', fontWeight: 500 }}>{emp.citizenName}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '14px', color: 'var(--color-accent)' }}>{emp.position}</td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>{cs}{emp.hourlyWage}</td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{emp.hoursWorked.toFixed(1)}h</td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-muted)' }}>{new Date(emp.hiredAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
                <div className="glass-card p-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📦 Inventory</h3>
                    {inventory.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>No items in inventory.</p>
                    ) : (
                        <div className="table-scroll-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                        {['Resource', 'Category', 'Qty', 'Unit Value', 'Total Value'].map(h => (
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
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>{cs}{item.unitValue}</td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-data)', fontWeight: 500 }}>{cs}{item.totalValue.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Production Tab */}
            {activeTab === 'production' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📥 Required Inputs</h3>
                        {production.inputs.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No inputs configured.</p>
                        ) : production.inputs.map((inp, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                                <span>{inp.resourceName}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-warning)' }}>×{inp.quantityRequired}/cycle</span>
                            </div>
                        ))}
                    </div>
                    <div className="glass-card p-6">
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📤 Outputs Produced</h3>
                        {production.outputs.length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px' }}>No outputs configured.</p>
                        ) : production.outputs.map((out, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--color-card-border)' }}>
                                <span>{out.resourceName}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>×{out.quantityProduced}/cycle</span>
                            </div>
                        ))}
                    </div>
                    <div className="glass-card p-6" style={{ gridColumn: 'span 2' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>⚡ Production Capacity</h3>
                        <div style={{ fontSize: '36px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-data)' }}>
                            {production.capacity} <span style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>units/cycle</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
                <div className="glass-card p-6">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>💸 Transaction History</h3>
                    {transactions.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '24px' }}>No transactions yet.</p>
                    ) : (
                        <div className="table-scroll-container">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                        {['Type', 'Amount', 'From', 'To', 'Description', 'Date'].map(h => (
                                            <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-card-border)' }}>
                                            <td style={{ padding: '10px 12px' }}>
                                                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: 'var(--color-bg-elevated)', color: 'var(--color-accent)' }}>{tx.type}</span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: tx.receiverBusiness?.name === business.name ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 500 }}>
                                                {tx.receiverBusiness?.name === business.name ? '+' : '-'}{cs}{tx.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{tx.senderCitizen?.displayName || tx.senderBusiness?.name || 'Treasury'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px' }}>{tx.receiverCitizen?.displayName || tx.receiverBusiness?.name || 'Treasury'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--color-text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || '—'}</td>
                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    )
}
