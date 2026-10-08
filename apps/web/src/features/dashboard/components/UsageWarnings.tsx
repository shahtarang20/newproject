import { useQuery } from '@tanstack/react-query';
import { LimitBanner } from '@/components/common/LimitBanner';
import { analyticsApi } from '@/api/endpoints/analytics';
import { queryKeys } from '@/api/queryKeys';

/** One banner per limit at >= 80%. Silent on error. */
export function UsageWarnings() {
  const { data } = useQuery({ queryKey: queryKeys.shop.usage(), queryFn: analyticsApi.usage, retry: false });
  if (!data) return null;
  const hot = data.usage.filter((u) => u.limit != null && u.limit > 0 && (u.used / (u.limit as number)) * 100 >= 80);
  if (!hot.length) return null;
  return (
    <div className="space-y-3">
      {hot.map((u) => (
        <LimitBanner key={u.key} limitKey={u.key} used={u.used} limit={u.limit} />
      ))}
    </div>
  );
}
