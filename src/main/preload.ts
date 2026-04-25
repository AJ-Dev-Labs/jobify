import { contextBridge, ipcRenderer } from 'electron'
import type { AppConfig, ExtractedProfile, RawJob } from '../shared/types.js'

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (config: AppConfig) => ipcRenderer.invoke('config:save', config),
  validateApiKey: (key: string) => ipcRenderer.invoke('openai:validate', key),
  openExternal: (url: string) => ipcRenderer.invoke('open:external', url),

  // PDF + extraction
  pickPdfFile: () => ipcRenderer.invoke('pdf:pick'),
  parsePdf: (filePath: string) => ipcRenderer.invoke('pdf:parse', filePath),
  extractProfile: (pdfText: string, fileName: string) => ipcRenderer.invoke('openai:extract', pdfText, fileName),
  generateEmbedding: (text: string) => ipcRenderer.invoke('openai:embed', text),

  // Profile
  getProfile: () => ipcRenderer.invoke('profile:get'),
  updateProfile: (profile: ExtractedProfile) => ipcRenderer.invoke('profile:update', profile),
  getRecentProfiles: () => ipcRenderer.invoke('profile:recent'),
  getResumeEmbedding: () => ipcRenderer.invoke('profile:embedding:get'),

  // Jobs
  fetchJobs: (skills: string[], keywords: string[]) => ipcRenderer.invoke('jobs:fetch', skills, keywords),
  scoreJobs: (jobs: RawJob[], profile: ExtractedProfile, resumeEmbedding: number[]) =>
    ipcRenderer.invoke('jobs:score', jobs, profile, resumeEmbedding),
  getStoredJobs: () => ipcRenderer.invoke('jobs:get'),
})
