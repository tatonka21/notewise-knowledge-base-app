import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, generatedApps, InsertGeneratedApp, GeneratedAppRecord } from "../drizzle/schema";
import { ENV } from "./_core/env";

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
      values.role = "admin";
      updateSet.role = "admin";
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

// TODO: add feature queries here as your schema grows.

export async function saveGeneratedApp(app: InsertGeneratedApp): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save generated app: database not available");
    return;
  }

  try {
    await db
      .insert(generatedApps)
      .values(app)
      .onDuplicateKeyUpdate({
        set: {
          name: app.name,
          description: app.description,
          code: app.code,
          preview: app.preview ?? null,
          buildStatus: app.buildStatus ?? "idle",
          buildError: app.buildError ?? null,
          apkUrl: app.apkUrl ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[Database] Failed to save generated app:", error);
    throw error;
  }
}

export async function getGeneratedApp(id: string): Promise<GeneratedAppRecord | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get generated app: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(generatedApps)
    .where(eq(generatedApps.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listGeneratedApps(opts?: { limit?: number; offset?: number }): Promise<GeneratedAppRecord[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list generated apps: database not available");
    return [];
  }

  const query = db.select().from(generatedApps).orderBy(generatedApps.createdAt).$dynamic();
  if (opts?.limit !== undefined) {
    query.limit(opts.limit);
  }
  if (opts?.offset !== undefined) {
    query.offset(opts.offset);
  }
  return await query;
}
