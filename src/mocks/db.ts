import { DB_VERSION, type Database } from './types'

const STORAGE_KEY = 'banking-dashboard:db'

/**
 * A tiny in-memory "database" persisted to localStorage so changes made in the
 * demo (transfers, memo edits) survive a refresh. Reset with resetDb().
 */
let db: Database

/** Loads the stored database, seeding a fresh one only when needed (faker is loaded lazily). */
export async function initDb() {
  db = loadStored() ?? (await seed())
}

function loadStored(): Database | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    // Storage unavailable or corrupt — fall through to a fresh seed.
  }
  return null
}

async function seed() {
  const { createSeedDatabase } = await import('./seed')
  const fresh = createSeedDatabase()
  persist(fresh)
  return fresh
}

function persist(next: Database) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Private mode / quota — the demo still works in memory.
  }
}

export function getDb() {
  return db
}

/** Apply a mutation (in place) and persist it. Returns whatever the mutator returns. */
export function updateDb<T>(mutator: (db: Database) => T): T {
  const result = mutator(db)
  persist(db)
  return result
}

export async function resetDb() {
  db = await seed()
}
