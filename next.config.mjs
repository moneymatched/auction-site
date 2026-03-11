/** @type {import('next').NextConfig} */
const nextConfig = {
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