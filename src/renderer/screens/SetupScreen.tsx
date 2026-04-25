import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/hooks/useAppState'

const MAX_LOCATIONS = 5

const PRESET_LOCATIONS = [
  { label: 'Remote', sublabel: 'Worldwide', value: 'Remote' },
  { label: 'United States', sublabel: 'USA', value: 'United States' },
  { label: 'Bangalore', sublabel: 'India', value: 'Bangalore, India' },
  { label: 'London', sublabel: 'UK', value: 'London, UK' },
  { label: 'Berlin', sublabel: 'Germany', value: 'Berlin, Germany' },
  { label: 'Tokyo', sublabel: 'Japan', value: 'Tokyo, Japan' },
  { label: 'Singapore', sublabel: 'SG', value: 'Singapore' },
  { label: 'Amsterdam', sublabel: 'Netherlands', value: 'Amsterdam, Netherlands' },
  { label: 'Canada', sublabel: 'CA', value: 'Canada' },
  { label: 'Sydney', sublabel: 'Australia', value: 'Sydney, Australia' },
]

function InputField({
  label, hint, value, onChange, placeholder, type = 'text', optional = false,
}: {
  label: string; hint?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  type?: string; optional?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">
        {label}
        {optional && <span className="normal-case text-outline-variant tracking-normal ml-1">(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-0 border-b border-outline-variant py-3 text-on-surface font-body-md text-[15px] focus:outline-none focus:border-secondary placeholder:text-outline-variant transition-colors"
      />
      {hint && <span className="font-caption text-[12px] text-on-surface-variant">{hint}</span>}
    </div>
  )
}

export default function SetupScreen() {
  const navigate = useNavigate()
  const { unlockScreen, isScreenUnlocked } = useAppState()

  const [userName, setUserName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [rapidApiKey, setRapidApiKey] = useState('')
  const [adzunaAppId, setAdzunaAppId] = useState('')
  const [adzunaAppKey, setAdzunaAppKey] = useState('')
  const [reedApiKey, setReedApiKey] = useState('')
  const [selectedLocations, setSelectedLocations] = useState<string[]>(['Remote', 'United States'])
  const [status, setStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadyConfigured, setAlreadyConfigured] = useState(false)
  const locationsLoaded = useRef(false)

  useEffect(() => {
    window.electronAPI.getConfig().then(config => {
      if (!config?.setupComplete) return
      setUserName(config.userName)
      if (config.rapidApiKey) setRapidApiKey(config.rapidApiKey)
      if (config.adzunaAppId) setAdzunaAppId(config.adzunaAppId)
      if (config.adzunaAppKey) setAdzunaAppKey(config.adzunaAppKey)
      if (config.reedApiKey) setReedApiKey(config.reedApiKey)
      if (config.preferredLocations?.length) setSelectedLocations(config.preferredLocations)
      setAlreadyConfigured(true)
    }).catch(() => {}).finally(() => {
      locationsLoaded.current = true
    })
  }, [])

  useEffect(() => {
    if (isScreenUnlocked('upload')) setAlreadyConfigured(true)
  }, [isScreenUnlocked])

  // Auto-save locations immediately on every change, once the config is loaded
  useEffect(() => {
    if (!locationsLoaded.current) return
    window.electronAPI.getConfig().then(config => {
      if (!config?.setupComplete) return
      window.electronAPI.saveConfig({ ...config, preferredLocations: selectedLocations })
    }).catch(() => {})
  }, [selectedLocations])

  function toggleLocation(value: string) {
    setSelectedLocations(prev => {
      if (prev.includes(value)) return prev.filter(l => l !== value)
      if (prev.length >= MAX_LOCATIONS) return prev
      return [...prev, value]
    })
  }

  function buildConfig() {
    return {
      userName: userName.trim(),
      openaiApiKey: apiKey.trim(),
      rapidApiKey: rapidApiKey.trim() || undefined,
      adzunaAppId: adzunaAppId.trim() || undefined,
      adzunaAppKey: adzunaAppKey.trim() || undefined,
      reedApiKey: reedApiKey.trim() || undefined,
      preferredLocations: selectedLocations,
      setupComplete: true,
    }
  }

  const canSubmit = userName.trim().length > 0 && apiKey.trim().length > 0 && status !== 'validating'

  async function handleSave() {
    if (!canSubmit) return
    setStatus('validating'); setErrorMsg('')
    const result = await window.electronAPI.validateApiKey(apiKey.trim())
    if (!result.valid) { setStatus('error'); setErrorMsg(result.error ?? 'API key validation failed.'); return }
    await window.electronAPI.saveConfig(buildConfig())
    unlockScreen('upload')
    setStatus('success')
    setAlreadyConfigured(true)
    navigate('/upload')
  }

  async function handleUpdateKey() {
    if (!canSubmit) return
    setStatus('validating'); setErrorMsg('')
    const result = await window.electronAPI.validateApiKey(apiKey.trim())
    if (!result.valid) { setStatus('error'); setErrorMsg(result.error ?? 'API key validation failed.'); return }
    await window.electronAPI.saveConfig(buildConfig())
    setStatus('success')
    setApiKey('')
  }

  return (
    <div className="p-margin-edge py-12 flex gap-16 min-h-screen">
      {/* Left: Form */}
      <div className="flex-1 max-w-xl">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 bg-secondary" />
          <span className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">
            Account Setup
          </span>
        </div>

        <h1 className="font-h1 text-[48px] leading-[1.1] tracking-[-0.02em] text-primary mb-4">
          Search the Matrix.
        </h1>
        <p className="font-body-lg text-[18px] leading-[1.6] text-on-surface-variant mb-12 max-w-md">
          Configure your credentials to begin document processing.
        </p>

        <div className="flex flex-col gap-8">
          <InputField label="User Name" value={userName} onChange={setUserName} placeholder="Your name" />

          <div className="flex flex-col gap-2">
            <InputField
              label="OpenAI API Key"
              type="password"
              value={apiKey}
              onChange={v => { setApiKey(v); setStatus('idle'); setErrorMsg('') }}
              placeholder={alreadyConfigured ? '•••••••• (enter new key to update)' : 'sk-...'}
              hint="Stored locally — only sent to OpenAI."
            />
            {errorMsg && <span className="font-caption text-[12px] text-error">{errorMsg}</span>}
            {status === 'success' && <span className="font-caption text-[12px] text-green-700">Key validated and saved.</span>}
          </div>

          {/* Location picker */}
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <label className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">
                Preferred Locations
              </label>
              <span className={`font-caption text-[12px] ${selectedLocations.length >= MAX_LOCATIONS ? 'text-secondary' : 'text-outline-variant'}`}>
                {selectedLocations.length}/{MAX_LOCATIONS} selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_LOCATIONS.map(loc => {
                const selected = selectedLocations.includes(loc.value)
                const disabled = !selected && selectedLocations.length >= MAX_LOCATIONS
                return (
                  <button
                    key={loc.value}
                    onClick={() => toggleLocation(loc.value)}
                    disabled={disabled}
                    className={`
                      text-left px-4 py-3 border transition-all flex items-center justify-between
                      ${selected
                        ? 'bg-primary border-primary text-background'
                        : disabled
                          ? 'border-outline-variant text-outline-variant opacity-40 cursor-not-allowed'
                          : 'border-outline-variant text-on-surface hover:border-secondary hover:text-secondary'
                      }
                    `}
                  >
                    <div>
                      <p className="font-ui-label text-[12px] uppercase tracking-widest leading-tight">{loc.label}</p>
                      <p className={`font-caption text-[11px] mt-0.5 ${selected ? 'text-background/70' : 'text-outline-variant'}`}>
                        {loc.sublabel}
                      </p>
                    </div>
                    {selected && <span className="material-symbols-outlined text-[14px] text-secondary flex-shrink-0">check</span>}
                  </button>
                )
              })}
            </div>
            <p className="font-caption text-[12px] text-outline-variant">
              Job searches will run for each selected location.
            </p>
          </div>

          {/* Optional API keys — collapsible section */}
          <details className="group">
            <summary className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest cursor-pointer flex items-center gap-2 select-none list-none">
              <span className="material-symbols-outlined text-[16px] transition-transform group-open:rotate-90">chevron_right</span>
              Additional Job Sources
              <span className="normal-case text-outline-variant tracking-normal font-normal">optional</span>
            </summary>
            <div className="mt-6 flex flex-col gap-6 pl-6 border-l border-outline-variant">
              <InputField
                label="RapidAPI Key" optional type="password"
                value={rapidApiKey} onChange={setRapidApiKey}
                placeholder="For JSearch — broader global listings"
                hint="Free tier: 200 req/month. Covers all selected locations."
              />
              <div className="flex flex-col gap-4">
                <label className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest">
                  Adzuna <span className="normal-case text-outline-variant tracking-normal font-normal">(UK, Germany, India, AU + more)</span>
                </label>
                <InputField
                  label="App ID" optional type="text"
                  value={adzunaAppId} onChange={setAdzunaAppId}
                  placeholder="adzuna app id"
                />
                <InputField
                  label="App Key" optional type="password"
                  value={adzunaAppKey} onChange={setAdzunaAppKey}
                  placeholder="adzuna app key"
                  hint="Free tier: 250 req/month. Register at developer.adzuna.com."
                />
              </div>
              <InputField
                label="Reed API Key" optional type="password"
                value={reedApiKey} onChange={setReedApiKey}
                placeholder="For UK-specific listings via Reed"
                hint="Free tier — only used when London / UK is a preferred location."
              />
            </div>
          </details>

          {/* Buttons */}
          <div className="flex items-center gap-4 pt-2">
            {!alreadyConfigured ? (
              <button
                onClick={handleSave}
                disabled={!canSubmit}
                className={`flex items-center gap-3 bg-primary text-background px-10 py-5 font-ui-label text-ui-label uppercase tracking-widest transition-transform ${canSubmit ? 'hover:-translate-y-0.5 active:translate-y-0 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <span className={`w-2 h-2 bg-secondary flex-shrink-0 ${status === 'validating' ? 'animate-pulse' : 'pulse-dot'}`} />
                {status === 'validating' ? 'Validating...' : 'Save & Initialize'}
              </button>
            ) : (
              <button
                onClick={handleUpdateKey}
                disabled={!canSubmit}
                className={`border border-primary text-primary px-8 py-4 font-ui-label text-ui-label uppercase tracking-widest transition-transform ${canSubmit ? 'hover:-translate-y-0.5 active:translate-y-0 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                {status === 'validating' ? 'Validating...' : 'Update Settings'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Algorithm info panel */}
      <div className="hidden lg:block w-80 border-l border-outline-variant pl-12 overflow-y-auto max-h-[80vh] self-start mt-[88px]">
        <h2 className="font-serif text-[28px] leading-[1.2] tracking-[-0.01em] italic text-on-surface border-b border-outline-variant pb-4 mb-6">
          The Matching Algorithm
        </h2>
        <div className="flex flex-col gap-6">
          {[
            { title: 'Vector Embeddings', body: "Your resume is converted into a 1536-dimension semantic vector using OpenAI's text-embedding-3-small model, capturing meaning beyond keywords." },
            { title: 'Semantic Correlation', body: "Cosine similarity measures alignment between your profile vector and each job posting's embedding — a 40% weight in the final score." },
            { title: 'Contextual Weighting', body: 'Skill overlap (30%), experience match (15%), location preference (10%), and salary alignment (5%) combine with semantic similarity for the final 0–10 score.' },
            { title: 'Recursive Refinement', body: 'Toggle individual skills on the Skills screen to re-weight your profile embedding on the fly — scores update without re-fetching jobs.' },
          ].map(item => (
            <div key={item.title}>
              <p className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-2">{item.title}</p>
              <p className="font-body-md text-[14px] text-on-surface-variant leading-relaxed">{item.body}</p>
            </div>
          ))}

          <div className="border-t border-outline-variant pt-6 mt-2">
            <p className="text-[11px] uppercase tracking-wider text-secondary font-medium mb-3">Job Sources</p>
            <div className="flex flex-col gap-2">
              {[
                { name: 'RemoteOK', note: 'Free, remote-only' },
                { name: 'JSearch', note: 'RapidAPI key, 200/mo' },
                { name: 'Adzuna', note: 'Free key, 250/mo, multi-region' },
                { name: 'Reed', note: 'Free key, UK only' },
              ].map(src => (
                <div key={src.name} className="flex justify-between items-baseline">
                  <span className="font-ui-label text-[11px] text-on-surface uppercase tracking-widest">{src.name}</span>
                  <span className="font-caption text-[11px] text-outline-variant">{src.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
