'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <DashboardLayout title="Settings">
            <div className="max-w-3xl">
                {/* Profile Section */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>
                    <div className="flex items-center gap-4 mb-6">
                        {session?.user?.image && (
                            <img
                                src={session.user.image}
                                alt="Profile"
                                className="w-16 h-16 rounded-full"
                            />
                        )}
                        <div>
                            <div className="text-lg font-medium text-white">{session?.user?.name}</div>
                            <div className="text-gray-400">{session?.user?.email}</div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-400">
                        Connected via Discord
                    </div>
                </div>

                {/* Preferences */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Preferences</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <div className="font-medium text-white">Email Notifications</div>
                                <div className="text-sm text-gray-400">Receive updates about your economies</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between py-3 border-b border-white/10">
                            <div>
                                <div className="font-medium text-white">Discord DM Alerts</div>
                                <div className="text-sm text-gray-400">Get DMs for important transactions</div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" defaultChecked className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-checked:bg-purple-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="glass-card p-6 border-red-500/30">
                    <h2 className="text-xl font-semibold text-red-400 mb-4">Danger Zone</h2>
                    <p className="text-gray-400 mb-4">
                        These actions are irreversible. Please proceed with caution.
                    </p>
                    <button className="px-4 py-2 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/20 transition">
                        Delete Account
                    </button>
                </div>
            </div>
        </DashboardLayout>
    )
}
