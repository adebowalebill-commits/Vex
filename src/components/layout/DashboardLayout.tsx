'use client'

import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
    children: React.ReactNode
    title: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Header title={title} />
                <div className="page-content animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
