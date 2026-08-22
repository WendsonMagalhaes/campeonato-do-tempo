import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { createLiveDeps } from '../domain/state.ts'
import { applyDemoSetup } from '../domain/seed.ts'
import { SCHEMA_VERSION } from '../domain/constants.ts'
import { createIndexedDbPersistence } from './indexedDb.ts'

describe('persistência IndexedDB', () => {
  it('grava, recarrega e rejeita backup inválido', async () => {
    const persistence = createIndexedDbPersistence()
    const state = applyDemoSetup(createLiveDeps())
    await persistence.save(state)
    const loaded = await persistence.load()
    expect(loaded?.participants).toHaveLength(34)
    expect(loaded?.teams).toHaveLength(16)
    await persistence.savePhoto('pic-1', 'data:image/png;base64,aaa')
    const backup = await persistence.exportBackup()
    expect(backup).toContain('"schemaVersion":')
    const restored = await persistence.importBackup(backup)
    expect(restored.schemaVersion).toBe(SCHEMA_VERSION)
    await expect(persistence.importBackup('{bad')).rejects.toThrow()
    await expect(persistence.importBackup(JSON.stringify({ schemaVersion: 99, state }))).rejects.toThrow()
  })
})
