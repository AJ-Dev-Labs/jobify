import { ipcMain, shell } from 'electron'
import OpenAI from 'openai'
import { store } from '../store.js'
import type { AppConfig } from '../../shared/types.js'

export function registerConfigHandlers() {
  ipcMain.handle('config:get', () => store.get('config', null as unknown as AppConfig))

  ipcMain.handle('config:save', (_event, config: AppConfig) => {
    store.set('config', config)
  })

  ipcMain.handle('openai:validate', async (_event, apiKey: string) => {
    try {
      const client = new OpenAI({ apiKey })
      await client.models.list()
      return { valid: true }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Invalid API key' }
    }
  })

  ipcMain.handle('open:external', (_event, url: string) => {
    shell.openExternal(url)
  })
}
