import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type BuildInfo, buildInfoSchema } from '@/lib/build-info';

const BUILD_INFO_URL = '/build-info.json';
const TOAST_LOAD_ERROR = 'Failed to load build info';
const TOAST_PARSE_ERROR = 'Build info is invalid';

export function useBuildInfo(): BuildInfo | null {
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null);

  useEffect(() => {
    fetch(BUILD_INFO_URL)
      .then(async (res) => {
        if (!res.ok) {
          toast.error(TOAST_LOAD_ERROR);
          return;
        }

        const result = buildInfoSchema.safeParse(await res.json());
        if (!result.success) {
          toast.error(TOAST_PARSE_ERROR);
          return;
        }
        setBuildInfo(result.data);
      })
      .catch(() => {
        toast.error(TOAST_LOAD_ERROR);
      });
  }, []);

  return buildInfo;
}
