import { type BuildInfo, getRunningBuildInfo } from '@/lib/build-info';

export function useBuildInfo(): BuildInfo | null {
  return getRunningBuildInfo();
}
