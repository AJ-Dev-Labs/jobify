import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/hooks/useAppState'
import type { ExtractedProfile, SkillEntry } from '@shared/types'

// Shown when no real profile is in the store yet
const MOCK_PROFILE: ExtractedProfile = {
  fileName: 'resume_v3.pdf',
  extractedAt: new Date().toISOString(),
  processingTimeMs: 3200,
  totalYearsExperience: 8,
  skills: [
    { name: 'React / TypeScript', category: 'technical', enabled: true },
    { name: 'Node.js', category: 'technical', enabled: true },
    { name: 'Python', category: 'technical', enabled: true },
    { name: 'PostgreSQL', category: 'technical', enabled: true },
    { name: 'Docker / Kubernetes', category: 'technical', enabled: true },
    { name: 'AWS (EC2, S3, Lambda)', category: 'technical', enabled: true },
    { name: 'System Design', category: 'domain', enabled: true },
    { name: 'API Architecture', category: 'domain', enabled: true },
    { name: 'Technical Writing', category: 'domain', enabled: true },
    { name: 'Team Leadership', category: 'domain', enabled: true },
    { name: 'Agile / Scrum', category: 'domain', enabled: true },
  ],
  experiences: [
    {
      dateRange: '2022 — PRESENT',
      title: 'Senior Software Engineer',
      company: 'Acme Corporation',
      description: 'Built scalable microservices handling 10M+ daily requests. Led a team of 5 engineers through a full platform migration.',
    },
    {
      dateRange: '2019 — 2022',
      title: 'Full-Stack Engineer',
      company: 'Bright Labs',
      description: 'Developed React/Node.js applications for enterprise clients. Reduced page load times by 60% through optimization.',
    },
    {
      dateRange: '2017 — 2019',
      title: 'Junior Developer',
      company: 'Startup Studio',
      description: 'Contributed to 3 product launches from MVP to production across the full stack.',
    },
  ],
  keywords: ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'PostgreSQL', 'Kubernetes', 'TypeScript', 'REST APIs', 'GraphQL', 'CI/CD', 'System Design'],
}

function formatTime(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export default function SkillsScreen() {
  const navigate = useNavigate()
  const { unlockScreen } = useAppState()

  const [profile, setProfile] = useState<ExtractedProfile | null>(null)
  const [skills, setSkills] = useState<SkillEntry[]>([])
  const [activeKeywords, setActiveKeywords] = useState<Set<string>>(new Set())
  const [isFinding, setIsFinding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.electronAPI.getProfile().then(p => {
      const data = p ?? MOCK_PROFILE
      setProfile(data)
      setSkills(data.skills.map(s => ({ ...s, enabled: true })))
      setActiveKeywords(new Set(data.keywords))
    }).catch(() => {
      setProfile(MOCK_PROFILE)
      setSkills(MOCK_PROFILE.skills.map(s => ({ ...s, enabled: true })))
      setActiveKeywords(new Set(MOCK_PROFILE.keywords))
    })
  }, [])

  function toggleSkill(name: string) {
    setSkills(prev => prev.map(s => s.name === name ? { ...s, enabled: !s.enabled } : s))
  }

  function toggleKeyword(kw: string) {
    setActiveKeywords(prev => {
      const next = new Set(prev)
      if (next.has(kw)) next.delete(kw)
      else next.add(kw)
      return next
    })
  }

  async function handleFindJobs() {
    if (!profile) return
    setIsFinding(true)
    setError('')

    try {
      // Save updated skill selection
      const updatedProfile = { ...profile, skills }
      await window.electronAPI.updateProfile(updatedProfile)

      // Get resume embedding
      const embedding = await window.electronAPI.getResumeEmbedding()
      if (!embedding) throw new Error('Resume embedding not found. Please re-upload your resume.')

      // Fetch and score jobs
      const activeSkillNames = skills.filter(s => s.enabled).map(s => s.name)
      const activeKws = Array.from(activeKeywords)
      const jobs = await window.electronAPI.fetchJobs(activeSkillNames, activeKws)
      await window.electronAPI.scoreJobs(jobs, updatedProfile, embedding.vector)

      unlockScreen('jobs')
      navigate('/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find jobs.')
    } finally {
      setIsFinding(false)
    }
  }

  if (!profile) {
    return (
      <div className="p-margin-edge py-12 flex items-center gap-3">
        <div className="w-2 h-2 bg-secondary animate-pulse" />
        <span className="font-ui-label text-ui-label text-on-surface-variant">Loading profile...</span>
      </div>
    )
  }

  const technicalSkills = skills.filter(s => s.category === 'technical')
  const domainSkills = skills.filter(s => s.category === 'domain')
  const primaryKeywords = profile.keywords.slice(0, 5)
  const secondaryKeywords = profile.keywords.slice(5)

  return (
    <div className="p-margin-edge py-12 max-w-5xl">
      {/* Page header */}
      <div className="border-b border-outline-variant pb-6 mb-12">
        <h1 className="font-h1 text-[48px] leading-[1.1] tracking-[-0.02em] text-primary mb-3">
          Extracted Profile
        </h1>
        <div className="flex items-center gap-3 font-ui-label text-ui-label text-secondary mb-4">
          <span>{profile.fileName}</span>
          <span className="text-outline-variant">•</span>
          <span>Processed in {formatTime(profile.processingTimeMs)}</span>
          <span className="text-outline-variant">•</span>
          <span>~{profile.totalYearsExperience} yrs exp</span>
        </div>
        <p className="font-serif italic text-[22px] text-primary">
          Total Experience: {profile.totalYearsExperience}+ Years
        </p>
      </div>

      {/* Core Capabilities */}
      <section className="mb-16">
        <div className="flex items-baseline gap-8 border-b border-outline-variant pb-4 mb-8">
          <span className="font-ui-label text-ui-label text-secondary shrink-0 w-40 uppercase">
            Core Capabilities
          </span>
          <h2 className="font-serif italic text-[32px] leading-[1.2] tracking-[-0.01em] text-on-surface">
            Specialized Skillset
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-x-24 gap-y-12 py-4">
          <div>
            <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-6">
              Technical Systems
            </p>
            <ul className="space-y-4">
              {technicalSkills.map(skill => (
                <li key={skill.name} className="flex items-center gap-4">
                  <div className={`w-2 h-2 flex-shrink-0 transition-colors ${skill.enabled ? 'bg-secondary' : 'bg-outline-variant'}`} />
                  <button
                    onClick={() => toggleSkill(skill.name)}
                    className={`font-body-md text-[15px] text-left transition-colors ${skill.enabled ? 'text-on-surface' : 'text-outline-variant line-through'}`}
                  >
                    {skill.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-6">
              Domain Expertise
            </p>
            <ul className="space-y-4">
              {domainSkills.map(skill => (
                <li key={skill.name} className="flex items-center gap-4">
                  <div className={`w-2 h-2 flex-shrink-0 transition-colors ${skill.enabled ? 'bg-secondary' : 'bg-outline-variant'}`} />
                  <button
                    onClick={() => toggleSkill(skill.name)}
                    className={`font-body-md text-[15px] text-left transition-colors ${skill.enabled ? 'text-on-surface' : 'text-outline-variant line-through'}`}
                  >
                    {skill.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Professional History */}
      <section className="mb-16">
        <div className="flex items-baseline gap-8 border-b border-outline-variant pb-4 mb-8">
          <span className="font-ui-label text-ui-label text-secondary shrink-0 w-40 uppercase">
            Professional History
          </span>
          <h2 className="font-serif italic text-[32px] leading-[1.2] tracking-[-0.01em] text-on-surface">
            Career Narrative
          </h2>
        </div>

        <div className="space-y-12">
          {profile.experiences.map((exp, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr] gap-x-12 items-baseline">
              <div>
                <p className="font-ui-label text-ui-label uppercase text-on-surface-variant mb-2">
                  {exp.dateRange}
                </p>
                <p className="font-serif text-[22px] leading-tight text-on-surface mb-1">
                  {exp.title}
                </p>
                <p className="font-serif italic text-secondary text-[16px]">{exp.company}</p>
              </div>
              <p className="font-body-md text-[15px] text-on-surface-variant leading-relaxed">
                {exp.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Extracted Keywords */}
      <section className="mb-16">
        <div className="flex items-baseline gap-8 border-b border-outline-variant pb-4 mb-8">
          <span className="font-ui-label text-ui-label text-secondary shrink-0 w-40 uppercase">
            Document Insights
          </span>
          <h2 className="font-serif italic text-[32px] leading-[1.2] tracking-[-0.01em] text-on-surface">
            Extracted Keywords
          </h2>
        </div>

        <div className="flex flex-wrap gap-4 py-4">
          {primaryKeywords.map(kw => (
            <button
              key={kw}
              onClick={() => toggleKeyword(kw)}
              className={`px-6 py-3 font-ui-label text-xs tracking-widest uppercase transition-all ${
                activeKeywords.has(kw)
                  ? 'bg-primary text-background'
                  : 'bg-transparent text-outline-variant border border-outline-variant'
              }`}
            >
              {kw}
            </button>
          ))}
          {secondaryKeywords.map(kw => (
            <button
              key={kw}
              onClick={() => toggleKeyword(kw)}
              className={`px-6 py-3 font-ui-label text-xs tracking-widest uppercase transition-all ${
                activeKeywords.has(kw)
                  ? 'border border-primary text-primary'
                  : 'border border-outline-variant text-outline-variant'
              }`}
            >
              {kw}
            </button>
          ))}
        </div>
      </section>

      {error && (
        <p className="font-caption text-[12px] text-error mb-4">{error}</p>
      )}

      {/* CTA */}
      <button
        onClick={handleFindJobs}
        disabled={isFinding}
        className={`
          flex items-center gap-3 bg-primary text-background px-10 py-5
          font-ui-label text-ui-label uppercase tracking-widest transition-transform
          ${isFinding ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}
        `}
      >
        <span className="w-2 h-2 bg-secondary pulse-dot flex-shrink-0" />
        {isFinding ? 'Finding Jobs...' : 'Find Matching Jobs'}
      </button>
    </div>
  )
}
