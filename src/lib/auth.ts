import NextAuth, { NextAuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
    // No adapter - we'll manually sync users to database
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID || '',
            clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
            authorization: {
                params: {
                    scope: 'identify email guilds',
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Manually sync user to database
            if (account?.provider === 'discord' && profile) {
                try {
                    const discordProfile = profile as {
                        id: string
                        username: string
                        email?: string
                        avatar?: string
                    }

                    // Upsert user in database
                    await prisma.user.upsert({
                        where: { discordId: discordProfile.id },
                        update: {
                            name: discordProfile.username,
                            email: discordProfile.email,
                            image: discordProfile.avatar
                                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                                : null,
                        },
                        create: {
                            discordId: discordProfile.id,
                            name: discordProfile.username,
                            email: discordProfile.email,
                            image: discordProfile.avatar
                                ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.png`
                                : null,
                        },
                    })
                    console.log('User synced to database:', discordProfile.id)
                } catch (error) {
                    console.error('Failed to sync user to database:', error)
                    // Don't block sign-in if database sync fails
                }
            }
            return true
        },
        async jwt({ token, user, account, profile }) {
            // On initial sign-in, add Discord ID to token
            if (account?.provider === 'discord' && profile) {
                const discordProfile = profile as { id: string }
                token.discordId = discordProfile.id

                // Fetch the database user ID
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { discordId: discordProfile.id },
                        select: { id: true }
                    })
                    if (dbUser) {
                        token.dbUserId = dbUser.id
                    }
                } catch (error) {
                    console.error('Failed to fetch user ID:', error)
                }
            }
            return token
        },
        async session({ session, token }) {
            // Add user IDs to session
            if (session.user) {
                session.user.id = (token.dbUserId as string) || (token.discordId as string)
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
    debug: process.env.NODE_ENV === 'development',
}

export default NextAuth(authOptions)
