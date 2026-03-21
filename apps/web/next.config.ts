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
    return [
      {
        source: '/cesium/:path*',
        headers: [
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
