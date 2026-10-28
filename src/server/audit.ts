import type { DbOrTx } from "./db";
import { auditEvents } from "./db/schema";

/** Records that something sensitive happened. Never pass values, tokens, balances or free text. */
export async function audit(
  db: DbOrTx,
  event: { userId: string | null; action: string; entityType?: string; entityId?: string; metadata?: Record<string, string | number | boolean> },
) {
  await db.insert(auditEvents).values({
    userId: event.userId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    metadata: event.metadata ?? {},
  });
}
