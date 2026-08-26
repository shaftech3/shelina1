import { adminCleanupService } from '@/services';
import type { AdminCleanupStats } from '@/types';
import { useAsync, type AsyncState } from './useAsync';
import { useDataRevision } from './useDataRevision';

export function useAdminCleanupStats(): AsyncState<AdminCleanupStats> {
  const revision = useDataRevision();
  return useAsync(() => adminCleanupService.getStats(), [revision]);
}
