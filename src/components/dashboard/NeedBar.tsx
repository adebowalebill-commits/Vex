interface NeedBarProps {
    label: string
    value: number
    maxValue?: number
    type: 'food' | 'water' | 'sleep'
    icon?: React.ReactNode
}

export default function NeedBar({ label, value, maxValue = 100, type, icon }: NeedBarProps) {
    const percentage = (value / maxValue) * 100
    const isCritical = percentage < 25

    const defaultIcons = {
        food: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
        ),
        water: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
        ),
        sleep: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        ),
    }

    return (
        <div className="need-bar">
            <div className="need-bar-header">
                <span className="need-bar-label">
                    {icon || defaultIcons[type]}
                    {label}
                </span>
                <span className="need-bar-value">{Math.round(value)}/{maxValue}</span>
            </div>
            <div className="need-bar-track">
                <div
                    className={`need-bar-fill ${type} ${isCritical ? 'critical' : ''}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    )
}
