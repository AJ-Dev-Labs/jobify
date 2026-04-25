import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '@/hooks/useAppState'

interface RecentProfile {
  fileName: string
  extractedAt: string
  size: number
}

type StepStatus = 'pending' | 'running' | 'done' | 'error'

interface Step {
  id: string
  label: string
  status: StepStatus
}

const INITIAL_STEPS: Step[] = [
  { id: 'parse', label: 'Parsing PDF', status: 'pending' },
  { id: 'extract', label: 'Extracting profile with GPT-4o-mini', status: 'pending' },
  { id: 'embed', label: 'Generating resume embedding', status: 'pending' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function UploadScreen() {
  const navigate = useNavigate()
  const { unlockScreen } = useAppState()
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; size: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS)
  const [error, setError] = useState('')
  const [recent, setRecent] = useState<RecentProfile[]>([])

  useEffect(() => {
    window.electronAPI.getRecentProfiles().then(setRecent).catch(() => {})
  }, [])

  function setStepStatus(id: string, status: StepStatus) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  async function handleBrowse() {
    const file = await window.electronAPI.pickPdfFile()
    if (file) setSelectedFile(file)
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('Only PDF files are supported.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('File exceeds 10 MB limit.'); return }
    // For drag-and-drop we can't get a real path in sandboxed renderer,
    // so trigger the native dialog instead for a proper path
    await handleBrowse()
  }

  async function handleExtract() {
    if (!selectedFile || isProcessing) return
    setError('')
    setIsProcessing(true)
    setSteps(INITIAL_STEPS)

    try {
      // Step 1: Parse PDF
      setStepStatus('parse', 'running')
      const { text } = await window.electronAPI.parsePdf(selectedFile.path)
      setStepStatus('parse', 'done')

      // Step 2: Extract profile
      setStepStatus('extract', 'running')
      const profile = await window.electronAPI.extractProfile(text, selectedFile.name)
      setStepStatus('extract', 'done')

      // Step 3: Generate embedding from skills + keywords summary
      setStepStatus('embed', 'running')
      const summaryText = [
        ...profile.skills.map(s => s.name),
        ...profile.keywords,
        ...profile.experiences.map(e => `${e.title} at ${e.company}`),
      ].join(', ')
      await window.electronAPI.generateEmbedding(summaryText)
      setStepStatus('embed', 'done')

      unlockScreen('skills')
      navigate('/skills')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Extraction failed.'
      setError(msg)
      setSteps(prev => prev.map(s => s.status === 'running' ? { ...s, status: 'error' } : s))
    } finally {
      setIsProcessing(false)
    }
  }

  const canExtract = selectedFile !== null && !isProcessing

  return (
    <div className="p-margin-edge py-12 flex gap-16 min-h-screen">
      {/* Left: main content */}
      <div className="flex-1">
        {/* Section header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-1 bg-secondary" />
          <span className="font-ui-label text-ui-label text-secondary uppercase tracking-[0.2em]">
            New Extraction
          </span>
        </div>

        <h1 className="font-h1 text-[48px] leading-[1.1] tracking-[-0.02em] text-primary mb-4 max-w-2xl">
          Refining documents into structured insight.
        </h1>

        {/* Dropzone */}
        <div className="relative mt-10 mb-6">
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              relative bg-surface-container-low border p-16 transition-all
              ${isDragging ? 'border-secondary translate-y-1' : 'border-transparent hover:border-outline-variant'}
            `}
          >
            <div className="absolute left-0 top-0 h-full w-px bg-outline-variant" />

            <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-4">
              Input Channel
            </p>
            <p className="font-serif text-[28px] text-primary mb-3">
              Drop your PDF here
            </p>
            <p className="font-body-md text-[15px] text-on-surface-variant mb-8">
              or{' '}
              <button
                onClick={handleBrowse}
                className="text-secondary border-b border-secondary hover:text-on-surface-variant transition-colors"
              >
                Browse files
              </button>
            </p>

            <div className="flex items-center gap-6 font-caption text-[12px] text-outline">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                Secured 256-bit
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">history</span>
                Retained for 24h
              </span>
            </div>
          </div>
        </div>

        {/* File status */}
        <div className="flex items-center justify-between py-4 border-b border-outline-variant mb-8">
          <div className="flex items-center gap-2 font-ui-label text-ui-label">
            <span className="text-on-surface-variant uppercase tracking-widest">Selected:</span>
            {selectedFile
              ? <span className="text-primary italic">{selectedFile.name}</span>
              : <span className="text-outline-variant">No file chosen</span>
            }
          </div>
          {selectedFile && !isProcessing && (
            <button
              onClick={() => { setSelectedFile(null); setSteps(INITIAL_STEPS); setError('') }}
              className="material-symbols-outlined text-[18px] text-outline-variant hover:text-primary transition-colors"
            >
              close
            </button>
          )}
        </div>

        {/* Pipeline progress */}
        {isProcessing && (
          <div className="mb-8 flex flex-col gap-3">
            {steps.map(step => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === 'pending' && <div className="w-2 h-2 bg-outline-variant flex-shrink-0" />}
                {step.status === 'running' && <div className="w-2 h-2 bg-secondary animate-pulse flex-shrink-0" />}
                {step.status === 'done' && <span className="material-symbols-outlined text-[16px] text-secondary flex-shrink-0">check</span>}
                {step.status === 'error' && <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">error</span>}
                <span className={`font-ui-label text-ui-label ${
                  step.status === 'done' ? 'text-on-surface-variant' :
                  step.status === 'running' ? 'text-on-surface' :
                  step.status === 'error' ? 'text-error' : 'text-outline-variant'
                }`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="font-caption text-[12px] text-error mb-6">{error}</p>
        )}

        {/* Extract button */}
        <button
          onClick={handleExtract}
          disabled={!canExtract}
          className={`
            flex items-center gap-3 bg-primary text-background
            px-8 py-4 font-ui-label text-ui-label uppercase tracking-widest
            transition-transform mb-16
            ${canExtract ? 'hover:-translate-y-1 active:translate-y-0 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
          `}
        >
          <span className="w-2 h-2 bg-secondary pulse-dot flex-shrink-0" />
          {isProcessing ? 'Processing...' : 'Extract Details'}
          <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
        </button>

        {/* Recent transcriptions */}
        <div>
          <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-4">
            Recent Transcriptions
          </p>
          <div className="border-t border-outline-variant">
            {recent.length === 0 ? (
              <p className="py-4 font-caption text-[12px] text-outline-variant">No previous extractions found.</p>
            ) : (
              recent.map(item => (
                <div
                  key={item.fileName}
                  className="group py-4 border-b border-outline-variant flex justify-between items-center hover:bg-surface-container-low transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-secondary flex-shrink-0" />
                    <div>
                      <p className="font-body-md text-[14px] text-primary">{item.fileName}</p>
                      <p className="font-caption text-[12px] text-outline">
                        Processed {formatDate(item.extractedAt)}
                      </p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant group-hover:text-primary transition-colors">
                    open_in_new
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right: Model status panel */}
      <div className="hidden lg:flex flex-col gap-8 w-64 border-l border-outline-variant pl-12 self-start mt-[88px]">
        <div>
          <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-4">
            Model Status
          </p>
          <div className="flex flex-col gap-2">
            <div className="h-px bg-outline-variant w-full relative">
              <div className="absolute top-0 left-0 h-px bg-secondary w-3/4" />
            </div>
            <p className="font-caption text-[12px] text-secondary">Neural Engine active</p>
          </div>
        </div>

        <div>
          <p className="font-ui-label text-ui-label text-on-surface-variant uppercase tracking-widest mb-4">
            Current Schema
          </p>
          <div className="flex flex-wrap gap-2">
            {['SKILLS', 'EXPERIENCE', 'KEYWORDS'].map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-surface-container-high font-ui-label text-[11px] text-primary uppercase tracking-widest"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
