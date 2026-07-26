/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.2.111", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async redirects() {
    return [
      {
        source: "/works/missing-boy",
        destination: "/works/koko-ni-iru",
        permanent: true,
      },
      {
        source: "/works/kieta-shounen",
        destination: "/works/koko-ni-iru",
        permanent: true,
      },
      {
        source: "/portal",
        destination: "https://koko-ni-iru.vercel.app/play/koko-ni-iru",
        permanent: false,
      },
    ]
  },
}

export default nextConfig
