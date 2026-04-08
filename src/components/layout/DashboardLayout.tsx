'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardLayoutProps {
    children: React.ReactNode
    title: string
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="app-layout">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <main className="main-content">
                <Header title={title} onMenuClick={() => setIsSidebarOpen(true)} />
                <div className="page-content animate-fade-in">
                    {children}
                </div>
            </main>
        </div>
    )
}
