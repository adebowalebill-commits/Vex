interface StatCardProps {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    icon?: React.ReactNode
}

export default function StatCard({ label, value, change, changeLabel, icon }: StatCardProps) {
    const isPositive = change !== undefined && change >= 0

    return (
        <div className="stat-card animate-fade-in">
            <div className="stat-card-header">
                <span className="stat-card-label">{label}</span>
                {icon && <div className="stat-card-icon">{icon}</div>}
            </div>
            <div className="stat-card-value">{value}</div>
            {change !== undefined && (
                <div className={`stat-card-change ${isPositive ? 'positive' : 'negative'}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        {isPositive ? (
                            <polyline points="18 15 12 9 6 15" />
                        ) : (
                            <polyline points="6 9 12 15 18 9" />
                        )}
                    </svg>
                    <span>{Math.abs(change)}%</span>
                    {changeLabel && <span style={{ color: 'var(--color-text-muted)' }}>{changeLabel}</span>}
                </div>
            )}
        </div>
    )
}
