import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const authOptions = {
    providers: [
        CredentialsProvider({
            id: 'credentials',
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Please enter an email and password');
                }
                await dbConnect();
                const user = await User.findOne({ email: credentials.email }).select('+password');
                if (!user) throw new Error('No user found with this email');
                const isMatch = await bcrypt.compare(credentials.password, user.password);
                if (!isMatch) throw new Error('Invalid password');
                return { id: user._id.toString(), email: user.email, role: user.role };
            }
        }),
        CredentialsProvider({
            id: 'cas',
            name: 'CAS',
            credentials: {
                ticket: { label: "Ticket", type: "text" }
            },
            async authorize(credentials, req) {
                if (!credentials?.ticket) return null;

                // Validate ticket with CAS
                const serviceUrl = `${process.env.NEXTAUTH_URL}/login-cas`;
                const validateUrl = `https://cas.u-bordeaux.fr/cas/serviceValidate?service=${encodeURIComponent(serviceUrl)}&ticket=${credentials.ticket}`;

                try {
                    const response = await fetch(validateUrl);
                    const text = await response.text();

                    // Simple XML parsing to find <cas:user>
                    const match = text.match(/<cas:user>(.*?)<\/cas:user>/);
                    if (match && match[1]) {
                        const username = match[1];
                        await dbConnect();

                        // Find or create user
                        // Note: CAS users might not have an email in the response, usually it's the uid (e.g., zacta)
                        // We'll construct a fake email or use the uid as email if the model allows
                        const email = `${username}@u-bordeaux.fr`;

                        let user = await User.findOne({ email });
                        if (!user) {
                            // Create new user
                            // Password is required by schema but irrelevant for CAS, generate random one
                            const randomPassword = Math.random().toString(36).slice(-8);
                            const hashedPassword = await bcrypt.hash(randomPassword, 10);

                            user = await User.create({
                                email,
                                password: hashedPassword,
                                role: 'user', // Default role
                                calendarToken: Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
                            });
                        }

                        return { id: user._id.toString(), email: user.email, role: user.role };
                    } else {
                        console.error('CAS Validation Failed:', text);
                        throw new Error('CAS validation failed');
                    }
                } catch (error) {
                    console.error('CAS Error:', error);
                    throw new Error('CAS authentication error');
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session?.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};
