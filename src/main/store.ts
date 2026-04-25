import Store from 'electron-store'
import type { AppConfig, ExtractedProfile, ScoredJob, ResumeEmbedding } from '../shared/types.js'

interface StoreSchema {
  config: AppConfig
  profile: ExtractedProfile
  resumeEmbedding: ResumeEmbedding
  jobs: ScoredJob[]
  recentProfiles: Array<{ fileName: string; extractedAt: string; size: number }>
}

export const store = new Store<StoreSchema>()
