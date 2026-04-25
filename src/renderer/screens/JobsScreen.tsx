import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScoredJob } from '@shared/types'

const MAX_LOCATIONS = 5

const PRESET_LOCATIONS = [
  { label: 'Remote',       sublabel: 'Worldwide',   value: 'Remote' },
  { label: 'United States', sublabel: 'USA',         value: 'United States' },
  { label: 'Bangalore',    sublabel: 'India',        value: 'Bangalore, India' },
  { label: 'London',       sublabel: 'UK',           value: 'London, UK' },
  { label: 'Berlin',       sublabel: 'Germany',      value: 'Berlin, Germany' },
  { label: 'Tokyo',        sublabel: 'Japan',        value: 'Tokyo, Japan' },
  { label: 'Singapore',    sublabel: 'SG',           value: 'Singapore' },
  { label: 'Amsterdam',    sublabel: 'Netherlands',  value: 'Amsterdam, Netherlands' },
  { label: 'Canada',       sublabel: 'CA',           value: 'Canada' },
  { label: 'Sydney',       sublabel: 'Australia',    value: 'Sydney, Australia' },
]

type RefreshStep = { label: string; status: 'pending' | 'running' | 'done' | 'error' }

const MOCK_JOBS: ScoredJob[] = [
  {
    id: '1', postedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    title: 'Senior Full-Stack Engineer', company: 'Meridian Labs', location: 'Remote', isRemote: true,
    salaryMin: 165000, salaryMax: 190000,
    description: "Seeking a meticulous engineer to architect and own our core platform services. You'll work across the full stack building scalable React frontends and Node.js APIs serving millions of users.",
    url: '#', source: 'remoteok', score: 9.8,
    matchedSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
    scoreBreakdown: { cosineSimilarity: 0.92, skillOverlap: 0.8, experienceMatch: 1, locationMatch: 1, salaryMatch: 0.85, weightedTotal: 9.8 },
  },
  {
    id: '2', postedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    title: 'Lead Platform Engineer', company: 'Construct Inc.', location: 'New York, NY (Hybrid)', isRemote: false,
    salaryMin: 155000, salaryMax: 175000,
    description: 'Join our infrastructure team to lead the design and implementation of internal developer platforms.',
    url: '#', source: 'jsearch', score: 9.2,
    matchedSkills: ['Kubernetes', 'Docker', 'AWS', 'Python'],
    scoreBreakdown: { cosineSimilarity: 0.87, skillOverlap: 0.7, experienceMatch: 1, locationMatch: 0.7, salaryMatch: 0.85, weightedTotal: 9.2 },
  },
  {
    id: '3', postedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    title: 'Software Engineer — Backend Systems', company: 'Odalys Technologies', location: 'Remote', isRemote: true,
    salaryMin: 130000, salaryMax: 155000,
    description: 'Build the backbone of our data pipeline infrastructure. Experience with PostgreSQL and Python is essential.',
    url: '#', source: 'remoteok', score: 8.5,
    matchedSkills: ['Python', 'PostgreSQL', 'Docker'],
    scoreBreakdown: { cosineSimilarity: 0.81, skillOverlap: 0.6, experienceMatch: 1, locationMatch: 1, salaryMatch: 0.5, weightedTotal: 8.5 },
  },
]

function formatPostedAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 14) return '1 week ago'
  return `${Math.floor(days / 7)} weeks ago`
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return ''
  const fmt = (n: number) => `$${Math.round(n / 1000)}k`
  if (min && max) return `${fmt(min)} — ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `Up to ${fmt(max!)}`
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  remoteok: { label: 'RemoteOK', color: 'text-green-700 border-green-300' },
  jsearch:  { label: 'JSearch',  color: 'text-blue-700 border-blue-300' },
  adzuna:   { label: 'Adzuna',   color: 'text-purple-700 border-purple-300' },
  reed:     { label: 'Reed',     color: 'text-orange-700 border-orange-300' },
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE_LABELS[source] ?? { label: source, color: 'text-outline border-outline-variant' }
  return (
    <span className={`border px-2 py-0.5 font-ui-label text-[10px] uppercase tracking-widest ${s.color}`}>
      {s.label}
    </span>
  )
}

function StepIndicator({ steps }: { steps: RefreshStep[] }) {
  return (
    <div className="flex flex-col gap-2 py-4">
      {steps.map(step => (
        <div key={step.label} className="flex items-center gap-3">
          {step.status === 'pending' && <div className="w-2 h-2 bg-outline-variant flex-shrink-0" />}
          {step.status === 'running' && <div className="w-2 h-2 bg-secondary animate-pulse flex-shrink-0" />}
          {step.status === 'done'    && <span className="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">check</span>}
          {step.status === 'error'   && <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">error</span>}
          <span className={`font-ui-label text-ui-label ${
            step.status === 'running' ? 'text-on-surface' :
            step.status === 'done'    ? 'text-on-surface-variant' :
            step.status === 'error'   ? 'text-error' : 'text-outline-variant'
          }`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="font-caption text-[11px] text-outline-variant uppercase tracking-widest">{label}</span>
      <span className="font-ui-label text-[12px] text-on-surface">{value}</span>
    </div>
  )
}

export default function JobsScreen() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState('')
  const [refreshSteps, setRefreshSteps] = useState<RefreshStep[]>([])

  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Remote', 'United States'])
  const [locationsChanged, setLocationsChanged] = useState(false)

  const [expandedScore, setExpandedScore] = useState<string | null>(null)
  const [minScore, setMinScore] = useState(0)
  const [remoteOnly, setRemoteOnly] = useState(false)

  // Load stored jobs + current location prefs on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.getStoredJobs().catch(() => [] as ScoredJob[]),
      window.electronAPI.getConfig().catch(() => null),
    ]).then(([stored, config]) => {
      setJobs(stored.length > 0 ? stored : MOCK_JOBS)
      if (config?.preferredLocations?.length) {
        setSelectedLocations(config.preferredLocations)
      }
    }).finally(() => setLoading(false))
  }, [])

  function toggleLocation(value: string) {
    setSelectedLocations(prev => {
      const next = prev.includes(value)
        ? prev.filter(l => l !== value)
        : prev.length >= MAX_LOCATIONS ? prev : [...prev, value]
      setLocationsChanged(true)
      return next
    })
  }

  function setStep(label: string, status: RefreshStep['status']) {
    setRefreshSteps(prev => prev.map(s => s.label === label ? { ...s, status } : s))
  }

  async function handleRefresh() {
    setIsRefreshing(true)
    setRefreshError('')
    setLocationsChanged(false)
    setRefreshSteps([
      { label: 'Saving location preferences', status: 'pending' },
      { label: 'Fetching jobs from sources',  status: 'pending' },
      { label: 'Scoring matches with AI',     status: 'pending' },
    ])

    try {
      // Step 1: Save updated locations to config
      setStep('Saving location preferences', 'running')
      const config = await window.electronAPI.getConfig()
      if (!config?.setupComplete) throw new Error('Setup not complete. Please configure your API key first.')
      await window.electronAPI.saveConfig({ ...config, preferredLocations: selectedLocations })
      setStep('Saving location preferences', 'done')

      // Step 2: Fetch jobs
      setStep('Fetching jobs from sources', 'running')
      const profile = await window.electronAPI.getProfile()
      if (!profile) throw new Error('No profile found. Please upload your resume first.')
      const skills = profile.skills.filter(s => s.enabled).map(s => s.name)
      const rawJobs = await window.electronAPI.fetchJobs(skills, profile.keywords)
      setStep('Fetching jobs from sources', 'done')

      // Step 3: Score
      setStep('Scoring matches with AI', 'running')
      const embedding = await window.electronAPI.getResumeEmbedding()
      if (!embedding) throw new Error('Resume embedding not found. Please re-upload your resume.')
      const scored = await window.electronAPI.scoreJobs(rawJobs, profile, embedding.vector)
      setStep('Scoring matches with AI', 'done')

      setJobs(scored)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refresh failed.'
      setRefreshError(msg)
      setRefreshSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s))
    } finally {
      setIsRefreshing(false)
    }
  }

  const filtered = jobs.filter(j => {
    if (j.score < minScore) return false
    if (remoteOnly && !j.isRemote) return false
    return true
  })

  if (loading) {
    return (
      <div className="p-margin-edge py-12 flex items-center gap-3">
        <div className="w-2 h-2 bg-secondary animate-pulse" />
        <span className="font-ui-label text-ui-label text-on-surface-variant">Loading matches...</span>
      </div>
    )
  }

  return (
    <div className="p-margin-edge py-12">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-1 bg-secondary" />
          <span className="font-ui-label text-ui-label text-secondary uppercase tracking-[0.2em]">
            AI-Matched Results
          </span>
        </div>
        <h1 className="font-h1 text-[48px] leading-[1.1] tracking-[-0.02em] text-primary mb-4">
          Curated Matches
        </h1>
        <p className="font-body-lg text-[18px] leading-[1.6] text-on-surface-variant max-w-2xl">
          {filtered.length} positions ranked by alignment with your profile. Click any score to see the breakdown.
        </p>
      </div>

      {/* Location selector + refresh */}
      <div className="border border-outline-variant p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">location_on</span>
            <span className="font-ui-label text-ui-label text-on-surface uppercase tracking-widest">
              Search Locations
            </span>
            <span className={`font-caption text-[11px] ml-1 ${selectedLocations.length >= MAX_LOCATIONS ? 'text-secondary' : 'text-outline-variant'}`}>
              {selectedLocations.length}/{MAX_LOCATIONS}
            </span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-6 py-3
              font-ui-label text-ui-label uppercase tracking-widest transition-transform
              ${isRefreshing
                ? 'bg-surface-container text-on-surface-variant cursor-not-allowed'
                : locationsChanged
                  ? 'bg-secondary text-background hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-primary text-background hover:-translate-y-0.5 active:translate-y-0'
              }
            `}
          >
            {isRefreshing
              ? <><div className="w-2 h-2 bg-outline-variant animate-spin border border-current rounded-full" />Searching...</>
              : <><span className="w-2 h-2 bg-secondary flex-shrink-0 pulse-dot" />
                {locationsChanged ? 'Apply & Refresh' : 'Refresh Results'}
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </>
            }
          </button>
        </div>

        {/* Location chips */}
        <div className="flex flex-wrap gap-2">
          {PRESET_LOCATIONS.map(loc => {
            const selected = selectedLocations.includes(loc.value)
            const disabled = !selected && selectedLocations.length >= MAX_LOCATIONS
            return (
              <button
                key={loc.value}
                onClick={() => toggleLocation(loc.value)}
                disabled={disabled || isRefreshing}
                className={`
                  flex items-center gap-2 px-3 py-2 border transition-all
                  ${selected
                    ? 'bg-primary border-primary text-background'
                    : disabled || isRefreshing
                      ? 'border-outline-variant text-outline-variant opacity-40 cursor-not-allowed'
                      : 'border-outline-variant text-on-surface-variant hover:border-secondary hover:text-secondary cursor-pointer'
                  }
                `}
              >
                <span className="font-ui-label text-[11px] uppercase tracking-widest">{loc.label}</span>
                <span className={`font-caption text-[10px] ${selected ? 'text-background/60' : 'text-outline-variant'}`}>
                  {loc.sublabel}
                </span>
                {selected && (
                  <span className="material-symbols-outlined text-[12px] text-secondary">check</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Refresh progress */}
        {(isRefreshing || refreshSteps.some(s => s.status === 'done' || s.status === 'error')) && (
          <div className="mt-4 border-t border-outline-variant pt-4">
            <StepIndicator steps={refreshSteps} />
            {refreshError && (
              <p className="font-caption text-[12px] text-error mt-2">{refreshError}</p>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-8 py-4 border-y border-outline-variant mb-10">
        <div className="flex items-center gap-3">
          <label className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">
            Min Score
          </label>
          <select
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="bg-transparent border-b border-outline-variant py-1 px-2 font-body-md text-[14px] text-on-surface focus:outline-none focus:border-secondary"
          >
            <option value={0}>All</option>
            <option value={7}>7.0+</option>
            <option value={8}>8.0+</option>
            <option value={9}>9.0+</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRemoteOnly(p => !p)}
            className={`w-4 h-4 border flex items-center justify-center transition-colors ${remoteOnly ? 'bg-primary border-primary' : 'border-outline-variant'}`}
          >
            {remoteOnly && <span className="material-symbols-outlined text-[12px] text-background">check</span>}
          </button>
          <span
            className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest cursor-pointer"
            onClick={() => setRemoteOnly(p => !p)}
          >
            Remote Only
          </span>
        </div>

        <button
          onClick={() => navigate('/skills')}
          className="ml-auto font-caption text-[12px] text-outline-variant hover:text-secondary transition-colors underline underline-offset-2"
        >
          ← Adjust Skills
        </button>

        <span className="font-caption text-[12px] text-outline-variant">
          {filtered.length} of {jobs.length} shown
        </span>
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif italic text-[24px] text-on-surface-variant mb-4">No matching positions found.</p>
          <p className="font-body-md text-[15px] text-outline-variant">
            Try adjusting your filters or click Refresh Results with different locations.
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((job, idx) => (
            <div key={job.id}>
              <div className="flex group py-8">
                <div className="flex-1 pr-8">
                  <p className="font-ui-label text-[11px] text-outline-variant uppercase tracking-[0.2em] mb-2">
                    Posted {formatPostedAgo(job.postedAt)}
                  </p>
                  <h2 className="font-serif italic text-[32px] leading-[1.2] text-on-surface group-hover:text-secondary transition-colors cursor-pointer mb-3">
                    {job.title}
                  </h2>

                  <div className="flex items-center gap-6 font-ui-label text-[12px] text-on-surface-variant mb-6">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">apartment</span>
                      {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">location_on</span>
                      {job.location}
                    </span>
                    {formatSalary(job.salaryMin, job.salaryMax) && (
                      <span className="font-bold text-on-surface italic">
                        {formatSalary(job.salaryMin, job.salaryMax)}
                      </span>
                    )}
                    <SourceBadge source={job.source} />
                  </div>

                  <p className="font-body-md text-[15px] text-on-surface-variant leading-relaxed mb-6 max-w-2xl">
                    {job.description.slice(0, 250)}{job.description.length > 250 ? '...' : ''}
                  </p>

                  {job.matchedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {job.matchedSkills.map(skill => (
                        <span key={skill} className="px-3 py-1 bg-primary text-background font-ui-label text-[10px] uppercase tracking-wider">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.url && job.url !== '#' ? (
                    <button
                      onClick={() => window.electronAPI.openExternal(job.url)}
                      className="font-serif italic text-on-surface border-b border-on-surface pb-0.5 hover:text-secondary hover:border-secondary transition-colors"
                    >
                      Apply to Job →
                    </button>
                  ) : (
                    <span className="font-serif italic text-outline-variant border-b border-outline-variant pb-0.5">
                      Apply to Job →
                    </span>
                  )}
                </div>

                <div className="w-px border-l border-dashed border-secondary my-4" />

                <div className="w-32 text-right pl-8 pt-4 shrink-0">
                  <button
                    onClick={() => setExpandedScore(expandedScore === job.id ? null : job.id)}
                    className="text-right group/score"
                  >
                    <p className="font-serif text-[56px] leading-none text-on-surface group-hover/score:text-secondary transition-colors">
                      {job.score.toFixed(1)}
                    </p>
                    <p className="font-serif italic text-outline text-[16px]">/ 10 Match</p>
                  </button>

                  {expandedScore === job.id && (
                    <div className="mt-4 text-left border-t border-outline-variant pt-4 space-y-2">
                      <ScoreRow label="Semantic" value={`${Math.round(job.scoreBreakdown.cosineSimilarity * 100)}%`} />
                      <ScoreRow label="Skills"   value={`${Math.round(job.scoreBreakdown.skillOverlap * 10)}/10`} />
                      <ScoreRow label="Experience" value={job.scoreBreakdown.experienceMatch >= 1 ? '✓' : '~'} />
                      <ScoreRow label="Location"   value={job.scoreBreakdown.locationMatch >= 1 ? '✓' : '~'} />
                      <ScoreRow label="Salary"     value={job.scoreBreakdown.salaryMatch >= 0.8 ? '✓' : '~'} />
                    </div>
                  )}
                </div>
              </div>

              {idx < filtered.length - 1 && <div className="h-px bg-outline-variant opacity-30" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
