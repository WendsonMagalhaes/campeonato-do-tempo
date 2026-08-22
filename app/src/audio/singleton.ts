import { AudioDirectorImpl } from './AudioDirectorImpl.ts'

export const globalAudio = new AudioDirectorImpl()

// We can start preloading right away
globalAudio.preload().catch(console.error)
