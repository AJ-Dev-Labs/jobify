export interface AppConfig {
  userName: string
  openaiApiKey: string
  rapidApiKey?: string
  adzunaAppId?: string
  adzunaAppKey?: string
  reedApiKey?: string
  preferredLocations?: string[]
  setupComplete: boolean
}

export interface Experience {
  dateRange: string
  title: string
  company: string
  description: string
}

export interface SkillEntry {
  name: string
  category: 'technical' | 'domain'
  enabled: boolean
}

export interface ExtractedProfile {
  skills: SkillEntry[]
  experiences: Experience[]
  keywords: string[]
  totalYearsExperience: number
  fileName: string
  extractedAt: string
  processingTimeMs: number
}

export interface ResumeEmbedding {
  vector: number[]
  text: string
  createdAt: string
}

export interface RawJob {
  id: string
  title: string
  company: string
  location: string
  isRemote: boolean
  salaryMin?: number
  salaryMax?: number
  description: string
  url: string
  postedAt: string
  source: 'jsearch' | 'remoteok' | 'adzuna' | 'reed'
}

export interface ScoreBreakdown {
  cosineSimilarity: number
  skillOverlap: number
  experienceMatch: number
  locationMatch: number
  salaryMatch: number
  weightedTotal: number
}

export interface ScoredJob extends RawJob {
  score: number
  scoreBreakdown: ScoreBreakdown
  matchedSkills: string[]
  embedding?: number[]
}

export interface ElectronAPI {
  // Phase 3 — Setup
  validateApiKey: (key: string) => Promise<{ valid: boolean; error?: string }>
  saveConfig: (config: AppConfig) => Promise<void>
  getConfig: () => Promise<AppConfig | null>
  openExternal: (url: string) => Promise<void>

  // Phase 4 — Upload (stubbed until implemented)
  pickPdfFile: () => Promise<{ path: string; name: string; size: number } | null>
  parsePdf: (filePath: string) => Promise<{ text: string; pages: number }>
  extractProfile: (pdfText: string, fileName: string) => Promise<ExtractedProfile>
  generateEmbedding: (text: string) => Promise<number[]>

  // Phase 5 — Skills (stubbed until implemented)
  getProfile: () => Promise<ExtractedProfile | null>
  updateProfile: (profile: ExtractedProfile) => Promise<void>
  getRecentProfiles: () => Promise<Array<{ fileName: string; extractedAt: string; size: number }>>

  // Phase 6 — Jobs (stubbed until implemented)
  fetchJobs: (skills: string[], keywords: string[]) => Promise<RawJob[]>
  scoreJobs: (jobs: RawJob[], profile: ExtractedProfile, resumeEmbedding: number[]) => Promise<ScoredJob[]>
  getStoredJobs: () => Promise<ScoredJob[]>
  getResumeEmbedding: () => Promise<ResumeEmbedding | null>
}

export type ScreenId = 'setup' | 'upload' | 'skills' | 'jobs'

export interface NavState {
  unlockedScreens: ScreenId[]
  currentScreen: ScreenId
}

export interface PipelineStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
}
