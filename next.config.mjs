/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'ffprobe-static', 'fluent-ffmpeg', '@distube/ytdl-core'],
  },
};

export default nextConfig;
