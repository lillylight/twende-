import type { NextConfig } from 'next';
import path from 'path';
import { type Configuration } from 'webpack';

const nextConfig: NextConfig = {
  output: 'standalone',

  env: {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY ?? '',
    GOOGLE_3D_TILES_API_KEY: process.env.GOOGLE_3D_TILES_API_KEY ?? '',
  },

  serverExternalPackages: ['bullmq', 'ioredis'],

  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    if (!isServer) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CopyPlugin = require('copy-webpack-plugin');

      const cesiumSource = path.resolve(__dirname, 'node_modules', 'cesium', 'Build', 'Cesium');

      config.plugins = config.plugins ?? [];
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: path.join(cesiumSource, 'Workers'),
              to: path.resolve(__dirname, 'public', 'cesium', 'Workers'),
            },
            {
              from: path.join(cesiumSource, 'ThirdParty'),
              to: path.resolve(__dirname, 'public', 'cesium', 'ThirdParty'),
            },
            {
              from: path.join(cesiumSource, 'Assets'),
              to: path.resolve(__dirname, 'public', 'cesium', 'Assets'),
            },
            {
              from: path.join(cesiumSource, 'Widgets'),
              to: path.resolve(__dirname, 'public', 'cesium', 'Widgets'),
            },
          ],
        })
      );

      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback as Record<string, boolean | string>),
        fs: false,
        Buffer: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    config.module = config.module ?? { rules: [] };
    config.module.rules = config.module.rules ?? [];
    config.module.rules.push({
      test: /\.(?:glb|gltf|czml|geojson|topojson)$/,
      type: 'asset/resource' as const,
    });

    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  async headers() {
    const securityHeaders = [
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com https://cesium.com https://*.cesium.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cesium.com",
          "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://*.google.com https://*.cesium.com https://*.tile.openstreetmap.org",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.cesium.com wss://* ws://*",
          "frame-src 'self' https://maps.googleapis.com",
          "worker-src 'self' blob:",
          "child-src 'self' blob:",
          "media-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
      },
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/cesium/:path*',
        headers: [
          ...securityHeaders,
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
