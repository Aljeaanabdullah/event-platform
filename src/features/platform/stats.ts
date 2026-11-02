import "server-only";

import { logger } from "@/lib/logger";
import { createPublicClient } from "@/lib/supabase/public";

export type PlatformStats = {
  publishedEvents: number;
  approvedOrganizers: number;
  registeredUsers: number;
  ticketsSold: number;
};

/**
 * عرض الأرقام فقط عندما تصبح ذات معنى. قبل ذلك نعرض مزايا المنصة بدل أرقام صفرية أو وهمية.
 */
export const STATS_MIN_PUBLISHED_EVENTS = 10;

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("get_platform_stats");
  if (error || !data?.[0]) {
    if (error) logger.warn("platform stats unavailable", { code: error.code });
    return null;
  }
  const row = data[0];
  return {
    publishedEvents: row.published_events,
    approvedOrganizers: row.approved_organizers,
    registeredUsers: row.registered_users,
    ticketsSold: row.tickets_sold,
  };
}
