/** @type {import('next').NextConfig} */
const nextConfig = {
    async redirects() {
      return [
        {
          source: '/login',
          destination: '/dashboard',
          permanent: false,
        },
      ]
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'kghlzpuyyytoonihljfg.supabase.co',
          port: '',
          pathname: '/storage/v1/object/public/property-images/**',
        },
      ],
    },
  }
  
  export default nextConfig