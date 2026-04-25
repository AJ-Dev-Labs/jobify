import { ipcMain } from 'electron'
import OpenAI from 'openai'
import { store } from '../store.js'
import type { RawJob, ExtractedProfile, ScoredJob, ScoreBreakdown } from '../../shared/types.js'

// --- Scoring ---

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; magA += a[i] * a[i]; magB += b[i] * b[i]
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}

function computeSkillOverlap(job: RawJob, profile: ExtractedProfile): { ratio: number; matched: string[] } {
  const activeSkills = profile.skills.filter(s => s.enabled).map(s => s.name.toLowerCase())
  const jobText = `${job.title} ${job.description}`.toLowerCase()
  const matched = activeSkills.filter(s => jobText.includes(s))
  return { ratio: activeSkills.length > 0 ? matched.length / activeSkills.length : 0, matched }
}

function scoreJob(job: RawJob, profile: ExtractedProfile, resumeVec: number[], jobVec: number[]): ScoredJob {
  const cosine = cosineSimilarity(resumeVec, jobVec)
  const { ratio: skillRatio, matched: matchedSkills } = computeSkillOverlap(job, profile)
  const expMatch = profile.totalYearsExperience > 0 ? 1 : 0.6
  const locationMatch = job.isRemote ? 1 : 0.7
  const salaryMatch = job.salaryMin != null || job.salaryMax != null ? 0.85 : 0.5

  const weighted = cosine * 0.40 + skillRatio * 0.30 + expMatch * 0.15 + locationMatch * 0.10 + salaryMatch * 0.05
  const score = Math.min(10, Math.round(weighted * 10 * 10) / 10)

  const breakdown: ScoreBreakdown = {
    cosineSimilarity: Math.round(cosine * 100) / 100,
    skillOverlap: Math.round(skillRatio * 100) / 100,
    experienceMatch: Math.round(expMatch * 100) / 100,
    locationMatch: Math.round(locationMatch * 100) / 100,
    salaryMatch: Math.round(salaryMatch * 100) / 100,
    weightedTotal: score,
  }
  return { ...job, score, scoreBreakdown: breakdown, matchedSkills }
}

// --- Location helpers ---

const ADZUNA_COUNTRY_MAP: Record<string, string> = {
  'Remote':                  'us',
  'United States':           'us',
  'Bangalore, India':        'in',
  'London, UK':              'gb',
  'Berlin, Germany':         'de',
  'Tokyo, Japan':            'jp',
  'Canada':                  'ca',
  'Sydney, Australia':       'au',
  'Singapore':               'sg',
  'Amsterdam, Netherlands':  'nl',
}

const ADZUNA_CITY_MAP: Record<string, string> = {
  'Bangalore, India':        'Bangalore',
  'London, UK':              'London',
  'Berlin, Germany':         'Berlin',
  'Tokyo, Japan':            'Tokyo',
  'Sydney, Australia':       'Sydney',
  'Singapore':               'Singapore',
  'Amsterdam, Netherlands':  'Amsterdam',
}

// --- Fetchers ---

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function dedup(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>()
  return jobs.filter(j => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key); return true
  })
}

async function fetchRemoteOK(skills: string[]): Promise<RawJob[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'JobifyPortal/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json() as Array<{
      id?: string; slug?: string; company?: string; position?: string
      tags?: string[]; description?: string; salary_min?: number
      salary_max?: number; url?: string; date?: string
    }>
    const skillSet = skills.map(s => s.toLowerCase())
    return data.slice(1)
      .filter(j => !!j.position)
      .filter(j => {
        const text = `${j.position ?? ''} ${(j.tags ?? []).join(' ')} ${j.description ?? ''}`.toLowerCase()
        return skillSet.some(s => text.includes(s))
      })
      .slice(0, 25)
      .map(j => ({
        id: `remoteok-${j.slug ?? j.id ?? Math.random()}`,
        title: j.position ?? 'Unknown Position',
        company: j.company ?? 'Unknown Company',
        location: 'Remote',
        isRemote: true,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        description: stripHtml(j.description ?? '').slice(0, 2000),
        url: j.url ?? '',
        postedAt: j.date ?? new Date().toISOString(),
        source: 'remoteok' as const,
      }))
  } catch { return [] }
}

async function fetchJSearch(skills: string[], locations: string[], rapidApiKey: string): Promise<RawJob[]> {
  const skillQuery = skills.slice(0, 3).join(' ')
  const targets = locations.slice(0, 3)

  const results = await Promise.all(targets.map(async loc => {
    try {
      const query = loc === 'Remote' ? `${skillQuery} remote` : `${skillQuery} in ${loc}`
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&date_posted=month`
      const res = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      })
      if (!res.ok) return [] as RawJob[]
      const data = await res.json() as { data?: Array<{
        job_id: string; job_title: string; employer_name: string
        job_city?: string; job_country?: string; job_is_remote?: boolean
        job_min_salary?: number; job_max_salary?: number; job_description: string
        job_apply_link?: string; job_posted_at_datetime_utc?: string
      }> }
      return (data.data ?? []).slice(0, 15).map(j => ({
        id: `jsearch-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: j.job_is_remote ? 'Remote' : [j.job_city, j.job_country].filter(Boolean).join(', ') || loc,
        isRemote: j.job_is_remote ?? false,
        salaryMin: j.job_min_salary,
        salaryMax: j.job_max_salary,
        description: (j.job_description ?? '').slice(0, 2000),
        url: j.job_apply_link ?? '',
        postedAt: j.job_posted_at_datetime_utc ?? new Date().toISOString(),
        source: 'jsearch' as const,
      }))
    } catch { return [] as RawJob[] }
  }))

  return results.flat()
}

async function fetchAdzuna(skills: string[], locations: string[], appId: string, appKey: string): Promise<RawJob[]> {
  const what = skills.slice(0, 4).join(' ')

  const results = await Promise.all(locations.map(async loc => {
    const country = ADZUNA_COUNTRY_MAP[loc] ?? 'us'
    const city = ADZUNA_CITY_MAP[loc]
    try {
      const params = new URLSearchParams({
        app_id: appId,
        app_key: appKey,
        results_per_page: '20',
        what,
        'content-type': 'application/json',
      })
      if (city) params.set('where', city)

      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`)
      if (!res.ok) return [] as RawJob[]
      const data = await res.json() as { results?: Array<{
        id: string; title: string
        company?: { display_name?: string }
        location?: { display_name?: string }
        salary_min?: number; salary_max?: number
        description?: string; redirect_url?: string; created?: string
        contract_time?: string
      }> }
      return (data.results ?? []).map(j => ({
        id: `adzuna-${j.id}`,
        title: j.title,
        company: j.company?.display_name ?? 'Unknown Company',
        location: j.location?.display_name ?? loc,
        isRemote: j.contract_time === 'contract' || (j.location?.display_name ?? '').toLowerCase().includes('remote'),
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        description: stripHtml(j.description ?? '').slice(0, 2000),
        url: j.redirect_url ?? '',
        postedAt: j.created ?? new Date().toISOString(),
        source: 'adzuna' as const,
      }))
    } catch { return [] as RawJob[] }
  }))

  return results.flat()
}

async function fetchReed(skills: string[], reedApiKey: string): Promise<RawJob[]> {
  try {
    const keywords = skills.slice(0, 4).join(' ')
    const params = new URLSearchParams({ keywords, resultsToReturn: '25' })
    const credentials = btoa(`${reedApiKey}:`)
    const res = await fetch(`https://www.reed.co.uk/api/1.0/search?${params}`, {
      headers: { Authorization: `Basic ${credentials}` },
    })
    if (!res.ok) return []
    const data = await res.json() as { results?: Array<{
      jobId: number; jobTitle: string; employerName: string
      locationName?: string; minimumSalary?: number; maximumSalary?: number
      jobDescription?: string; jobUrl?: string; date?: string
    }> }
    return (data.results ?? []).map(j => ({
      id: `reed-${j.jobId}`,
      title: j.jobTitle,
      company: j.employerName,
      location: j.locationName ?? 'UK',
      isRemote: (j.locationName ?? '').toLowerCase().includes('remote'),
      salaryMin: j.minimumSalary,
      salaryMax: j.maximumSalary,
      description: stripHtml(j.jobDescription ?? '').slice(0, 2000),
      url: j.jobUrl ?? '',
      postedAt: j.date ?? new Date().toISOString(),
      source: 'reed' as const,
    }))
  } catch { return [] }
}

// --- IPC handlers ---

export function registerJobHandlers() {
  ipcMain.handle('jobs:fetch', async (_event, skills: string[], _keywords: string[]) => {
    const config = store.get('config')
    const locations = config?.preferredLocations?.length ? config.preferredLocations : ['Remote', 'United States']
    const hasRemote = locations.includes('Remote')
    const hasUK = locations.some(l => l.toLowerCase().includes('uk') || l.toLowerCase().includes('london'))

    const fetchers: Promise<RawJob[]>[] = [
      hasRemote ? fetchRemoteOK(skills) : Promise.resolve([]),
      config?.rapidApiKey ? fetchJSearch(skills, locations, config.rapidApiKey) : Promise.resolve([]),
      config?.adzunaAppId && config?.adzunaAppKey
        ? fetchAdzuna(skills, locations, config.adzunaAppId, config.adzunaAppKey)
        : Promise.resolve([]),
      config?.reedApiKey && hasUK ? fetchReed(skills, config.reedApiKey) : Promise.resolve([]),
    ]

    const all = (await Promise.all(fetchers)).flat()
    return dedup(all)
  })

  ipcMain.handle('jobs:score', async (_event, jobs: RawJob[], profile: ExtractedProfile, resumeEmbedding: number[]) => {
    const config = store.get('config')
    if (!config?.openaiApiKey) throw new Error('OpenAI API key not configured')

    const client = new OpenAI({ apiKey: config.openaiApiKey })
    const scored: ScoredJob[] = []
    const batchSize = 10

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize)
      const embeddings = await Promise.all(
        batch.map(async job => {
          try {
            const input = `${job.title} at ${job.company}. ${job.description}`.slice(0, 6000)
            const res = await client.embeddings.create({ model: 'text-embedding-3-small', input })
            return res.data[0].embedding
          } catch { return [] as number[] }
        })
      )
      for (let j = 0; j < batch.length; j++) {
        scored.push(scoreJob(batch[j], profile, resumeEmbedding, embeddings[j]))
      }
    }

    const sorted = scored.sort((a, b) => b.score - a.score)
    store.set('jobs', sorted)
    return sorted
  })

  ipcMain.handle('jobs:get', () => store.get('jobs', []))
}
