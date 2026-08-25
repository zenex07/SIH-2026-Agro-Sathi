import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { diagnoses, farms, harvestIntents, InsertFarm, InsertHarvestIntent, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listFarmsForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(farms).where(eq(farms.ownerId, ownerId)).orderBy(desc(farms.updatedAt));
}

export async function getFarmForOwner(ownerId: number, farmId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(farms).where(and(eq(farms.ownerId, ownerId), eq(farms.id, farmId))).limit(1);
  return result[0];
}

export async function createFarmForOwner(ownerId: number, values: Omit<InsertFarm, "ownerId" | "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Farm records are temporarily unavailable");
  const result = await db.insert(farms).values({ ...values, ownerId });
  const created = await getFarmForOwner(ownerId, Number(result[0].insertId));
  if (!created) throw new Error("Farm could not be created");
  return created;
}

export async function updateFarmForOwner(ownerId: number, farmId: number, values: Omit<InsertFarm, "ownerId" | "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Farm records are temporarily unavailable");
  await db.update(farms).set(values).where(and(eq(farms.ownerId, ownerId), eq(farms.id, farmId)));
  const updated = await getFarmForOwner(ownerId, farmId);
  if (!updated) throw new Error("Farm could not be updated");
  return updated;
}

export async function listDiagnosesForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diagnoses).where(eq(diagnoses.ownerId, ownerId)).orderBy(desc(diagnoses.createdAt)).limit(10);
}

export async function getDiagnosisForOwner(ownerId: number, diagnosisId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(diagnoses).where(and(eq(diagnoses.ownerId, ownerId), eq(diagnoses.id, diagnosisId))).limit(1);
  return result[0];
}

export async function createDiagnosisForOwner(ownerId: number, values: {
  farmId: number;
  crop: string;
  imageKey: string;
  imageUrl: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Diagnosis records are temporarily unavailable");
  const result = await db.insert(diagnoses).values({ ownerId, ...values, status: "uploaded" });
  const created = await getDiagnosisForOwner(ownerId, Number(result[0].insertId));
  if (!created) throw new Error("Photo record could not be created");
  return created;
}

export async function updateDiagnosisForOwner(ownerId: number, diagnosisId: number, values: Partial<{
  status: "uploaded" | "analysing" | "review" | "complete" | "failed";
  confidence: string | null;
  resultTitle: string | null;
  summary: string | null;
  evidence: string | null;
  actions: string | null;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Diagnosis records are temporarily unavailable");
  await db.update(diagnoses).set(values).where(and(eq(diagnoses.ownerId, ownerId), eq(diagnoses.id, diagnosisId)));
  return getDiagnosisForOwner(ownerId, diagnosisId);
}

export async function listHarvestIntentsForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(harvestIntents).where(eq(harvestIntents.ownerId, ownerId)).orderBy(desc(harvestIntents.updatedAt)).limit(12);
}

export async function createHarvestIntentForOwner(ownerId: number, values: Omit<InsertHarvestIntent, "ownerId" | "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Harvest-linkage planning is temporarily unavailable");
  const farm = await getFarmForOwner(ownerId, values.farmId);
  if (!farm) throw new Error("Choose one of your farms before creating a harvest plan");
  const result = await db.insert(harvestIntents).values({ ...values, ownerId });
  const created = await db.select().from(harvestIntents).where(and(eq(harvestIntents.ownerId, ownerId), eq(harvestIntents.id, Number(result[0].insertId)))).limit(1);
  if (!created[0]) throw new Error("Harvest plan could not be created");
  return created[0];
}
