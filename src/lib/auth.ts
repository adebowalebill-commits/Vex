import NextAuth, { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma) as NextAuthOptions['adapter'],
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
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
        async jwt({ token, user, account }) {
            // Persist the user id and discordId to the token
            if (user) {
                token.id = user.id
                token.discordId = (user as { discordId?: string }).discordId
            }
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            // Add user id to session
            if (session.user && token) {
                session.user.id = token.id as string
            }
            return session
        },
        async signIn({ user, account, profile }) {
            // Log sign-in attempts for debugging
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
        // Use JWT strategy for serverless - more reliable than database sessions
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    // Enable debug in production temporarily to see errors
    debug: true,
}

export default NextAuth(authOptions)
