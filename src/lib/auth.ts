import NextAuth, { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID || '',
            clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
            authorization: {
                params: {
                    scope: 'identify email guilds',
                },
            },
            profile(profile) {
                return {
                    id: profile.id,
                    name: profile.username,
                    email: profile.email,
                    image: profile.avatar
                        ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.${profile.avatar.startsWith('a_') ? 'gif' : 'png'}`
                        : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id) % 5}.png`,
                    discordId: profile.id,
                }
            },
        }),
    ],
    callbacks: {
        async session({ session, user }) {
            // For database strategy, user comes from database
            if (session.user && user) {
                session.user.id = user.id
            }
            return session
        },
        async signIn({ user, account, profile }) {
            console.log('Sign-in attempt:', {
                userId: user?.id,
                provider: account?.provider,
                email: profile?.email
            })
            return true
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'database',
        maxAge: 30 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
