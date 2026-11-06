import { createSeedDatabase, DB_VERSION, type Database } from './seed'

const STORAGE_KEY = 'banking-dashboard:db'

/**
 * A tiny in-memory "database" persisted to localStorage so changes made in the
 * demo (transfers, memo edits) survive a refresh. Reset with resetDb().
 */
let db: Database = load()

function load(): Database {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      if (parsed.version === DB_VERSION) return parsed
    }
  } catch {
    // Storage unavailable or corrupt — fall through to a fresh seed.
  }
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

/** Apply a mutation and persist it. */
export function updateDb(mutator: (draft: Database) => void) {
  mutator(db)
  persist(db)
}

export function resetDb() {
  db = createSeedDatabase()
  persist(db)
}
