import { useNavigate, useLocation } from 'react-router-dom'
import { useAppState } from '@/hooks/useAppState'
import type { ScreenId } from '@shared/types'

const NAV_ITEMS: { id: ScreenId; label: string; icon: string }[] = [
  { id: 'setup', label: 'Setup', icon: 'settings' },
  { id: 'upload', label: 'Upload', icon: 'upload_file' },
  { id: 'skills', label: 'Skills', icon: 'psychology' },
  { id: 'jobs', label: 'Jobs', icon: 'work_outline' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isScreenUnlocked } = useAppState()

  const currentPath = location.pathname.replace('/', '') || 'setup'

  return (
    <aside className="fixed left-0 top-[73px] bottom-0 w-64 border-r border-outline-variant bg-surface-container-low flex flex-col py-12 z-40">
      <div className="px-8 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-secondary" />
          <span className="font-ui-label text-ui-label text-on-surface uppercase tracking-widest">
            Workspace
          </span>
        </div>
        <p className="font-caption text-caption text-on-surface-variant">
          Job Matching Engine
        </p>
      </div>

      <nav className="flex flex-col">
        {NAV_ITEMS.map(item => {
          const unlocked = isScreenUnlocked(item.id)
          const active = currentPath === item.id

          return (
            <button
              key={item.id}
              onClick={() => unlocked && navigate(`/${item.id}`)}
              disabled={!unlocked}
              className={`
                text-left pl-8 py-3 flex items-center gap-3 transition-colors
                ${active
                  ? 'text-on-surface font-bold border-l-4 border-primary pl-[28px] bg-surface-container'
                  : unlocked
                    ? 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    : 'text-outline-variant cursor-not-allowed'
                }
              `}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-body-md text-[14px]">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
