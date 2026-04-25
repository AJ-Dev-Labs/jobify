import { ipcMain } from 'electron'
import { store } from '../store.js'
import type { ExtractedProfile } from '../../shared/types.js'

export function registerProfileHandlers() {
  ipcMain.handle('profile:get', () => store.get('profile', null as unknown as ExtractedProfile))

  ipcMain.handle('profile:update', (_event, profile: ExtractedProfile) => {
    store.set('profile', profile)
  })

  ipcMain.handle('profile:recent', () => store.get('recentProfiles', []))

  ipcMain.handle('profile:embedding:get', () => store.get('resumeEmbedding', null))
}
