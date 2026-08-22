import { SCHEMA_VERSION } from '../domain/constants.ts'
import { DomainError } from '../domain/errors.ts'
import type { TournamentState } from '../domain/types.ts'
import type { PersistencePort } from '../application/ports.ts'
import { migrateTournamentState } from './migrateState.ts'

const DB_NAME = 'campeonato-do-tempo'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function createIndexedDbPersistence(): PersistencePort {
  return {
    async save(state) {
      const db = await openDb()
      const tx = db.transaction('kv', 'readwrite')
      tx.objectStore('kv').put(state, 'current')
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    async load() {
      const db = await openDb()
      const value = await req<TournamentState | undefined>(
        db.transaction('kv').objectStore('kv').get('current'),
      )
      db.close()
      return value ? migrateTournamentState(value) : null
    },
    async savePhoto(id, dataUrl) {
      const db = await openDb()
      const tx = db.transaction('photos', 'readwrite')
      tx.objectStore('photos').put(dataUrl, id)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    },
    async getPhoto(id) {
      const db = await openDb()
      const value = await req<string | undefined>(
        db.transaction('photos').objectStore('photos').get(id),
      )
      db.close()
      return value ?? null
    },
    async exportBackup() {
      const db = await openDb()
      const state = await req<TournamentState | undefined>(
        db.transaction('kv').objectStore('kv').get('current'),
      )
      const photosTx = db.transaction('photos')
      const photosStore = photosTx.objectStore('photos')
      const keys = await req<IDBValidKey[]>(photosStore.getAllKeys())
      const photos: Record<string, string> = {}
      for (const key of keys) {
        const photo = await req<string>(photosStore.get(key))
        photos[String(key)] = photo
      }
      db.close()
      return JSON.stringify({ schemaVersion: SCHEMA_VERSION, state, photos }, null, 2)
    },
    async importBackup(json) {
      let parsed: { schemaVersion?: number; state?: TournamentState; photos?: Record<string, string> }
      try {
        parsed = JSON.parse(json) as typeof parsed
      } catch {
        throw new DomainError('BACKUP_INVALID', 'Backup inválido.')
      }
      if (parsed.schemaVersion !== SCHEMA_VERSION || !parsed.state) {
        throw new DomainError('BACKUP_VERSION', 'Versão de backup incompatível.')
      }
      const migrated = migrateTournamentState(parsed.state)
      const db = await openDb()
      const kv = db.transaction('kv', 'readwrite')
      kv.objectStore('kv').put(migrated, 'current')
      await new Promise<void>((resolve, reject) => {
        kv.oncomplete = () => resolve()
        kv.onerror = () => reject(kv.error)
      })
      if (parsed.photos) {
        const photos = db.transaction('photos', 'readwrite')
        photos.objectStore('photos').clear()
        for (const [id, data] of Object.entries(parsed.photos)) {
          photos.objectStore('photos').put(data, id)
        }
        await new Promise<void>((resolve, reject) => {
          photos.oncomplete = () => resolve()
          photos.onerror = () => reject(photos.error)
        })
      }
      db.close()
      return migrated
    },
  }
}
