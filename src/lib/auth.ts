import NextAuth, { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'

// Temporarily simplified auth without Prisma adapter for debugging
export const authOptions: NextAuthOptions = {
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
        async jwt({ token, user, account, profile }) {
            if (user) {
                token.id = user.id
                token.discordId = (user as { discordId?: string }).discordId
            }
            if (account) {
                token.accessToken = account.access_token
            }
            // Add Discord profile data
            if (profile) {
                token.discordId = (profile as { id?: string }).id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string || token.discordId as string
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60,
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: true,
}

export default NextAuth(authOptions)
