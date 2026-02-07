'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

interface HeaderProps {
    title: string
    onMenuClick?: () => void
}

export default function Header({ title, onMenuClick }: HeaderProps) {
    const { data: session } = useSession()

    return (
        <header className="header">
            <div className="header-left">
                {onMenuClick && (
                    <button
                        className="mobile-menu-btn"
                        onClick={onMenuClick}
                        aria-label="Open menu"
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                            <line x1="3" y1="12" x2="21" y2="12" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                )}
                <h1 className="page-title">{title}</h1>
            </div>

            <div className="header-right">
                {session?.user && (
                    <div className="user-menu">
                        <div className="user-info">
                            {session.user.image && (
                                <Image
                                    src={session.user.image}
                                    alt={session.user.name || 'User'}
                                    width={32}
                                    height={32}
                                    className="user-avatar"
                                />
                            )}
                            <span className="user-name">{session.user.name}</span>
                        </div>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="btn-secondary btn-sm"
                        >
                            Sign Out
                        </button>
                    </div>
                )}
                {!session?.user && (
                    <Link href="/login" className="btn-primary btn-sm">
                        Sign In
                    </Link>
                )}
            </div>
        </header>
    )
}
