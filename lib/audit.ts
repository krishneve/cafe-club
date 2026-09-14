import { db } from "./db";

export async function audit(cafeId: string, userId: string | null | undefined, action: string, entity: string, entityId?: string, metadata?: Record<string, unknown>) {
  return db.auditLog.create({
    data: {
      cafeId,
      userId: userId || null,
      action,
      entity,
      entityId: entityId || null,
      metadataJson: JSON.stringify(metadata || {}),
    },
  });
}
