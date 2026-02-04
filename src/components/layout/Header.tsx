'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

interface HeaderProps {
    title: string
}

export default function Header({ title }: HeaderProps) {
    const { data: session } = useSession()

    return (
        <header className="header">
            <div className="header-left">
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
