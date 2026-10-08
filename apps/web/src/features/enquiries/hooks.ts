import { useQuery } from '@tanstack/react-query';
import { enquiriesApi } from '@/api/endpoints/enquiries';
import { queryKeys } from '@/api/queryKeys';

export const enquiryStatsKey = [...queryKeys.enquiries.all, 'stats'] as const;

/** Source of truth for the unread (NEW) badge: GET /enquiries/stats. */
export function useEnquiryStats(enabled = true) {
  return useQuery({ queryKey: enquiryStatsKey, queryFn: enquiriesApi.stats, enabled, refetchInterval: 60_000 });
}
