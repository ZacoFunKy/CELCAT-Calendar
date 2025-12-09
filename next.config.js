/** @type {import('next').NextConfig} */
const nextConfig = {
    // Vercel optimizations
    experimental: {
        // Optimize serverless functions
        optimizePackageImports: ['ical-generator', 'ioredis'],
    },

    // Optimize production builds
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn']
        } : false,
    },

    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin'
                    }
                ]
            },
            // Optimize calendar API cache headers
            {
                source: '/api/calendar.ics',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, s-maxage=3600, stale-while-revalidate=7200'
                    },
                    {
                        key: 'CDN-Cache-Control',
                        value: 'public, s-maxage=3600'
                    }
                ]
            }
        ]
    }
}

module.exports = nextConfig
