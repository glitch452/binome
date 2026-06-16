import { readFileSync } from 'node:fs';

import type { NextConfig } from 'next';

const buildInfoJson = (() => {
  try {
    return readFileSync('./public/build-info.json', 'utf8');
  } catch {
    return '';
  }
})();

const nextConfig: NextConfig = {
  output: 'export',
  env: { NEXT_PUBLIC_BUILD_INFO: buildInfoJson },
};

export default nextConfig;
