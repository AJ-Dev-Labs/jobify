import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { ScreenId } from '@shared/types'

interface AppState {
  unlockedScreens: ScreenId[]
  unlockScreen: (id: ScreenId) => void
  isScreenUnlocked: (id: ScreenId) => boolean
  isLoading: boolean
}

const SCREEN_ORDER: ScreenId[] = ['setup', 'upload', 'skills', 'jobs']

const AppStateContext = createContext<AppState | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [unlockedScreens, setUnlockedScreens] = useState<ScreenId[]>(['setup'])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function initUnlock() {
      try {
        const [config, profile, jobs] = await Promise.all([
          window.electronAPI.getConfig().catch(() => null),
          window.electronAPI.getProfile().catch(() => null),
          window.electronAPI.getStoredJobs().catch(() => [] as never[]),
        ])

        const unlocked: ScreenId[] = ['setup']
        if (config?.setupComplete) unlocked.push('upload')
        if (profile) unlocked.push('skills')
        if (Array.isArray(jobs) && jobs.length > 0) unlocked.push('jobs')
        setUnlockedScreens(unlocked)
      } catch {
        // first run — only setup is unlocked
      } finally {
        setIsLoading(false)
      }
    }
    initUnlock()
  }, [])

  const unlockScreen = useCallback((id: ScreenId) => {
    setUnlockedScreens(prev => {
      if (prev.includes(id)) return prev
      const targetIndex = SCREEN_ORDER.indexOf(id)
      return SCREEN_ORDER.slice(0, targetIndex + 1)
    })
  }, [])

  const isScreenUnlocked = useCallback((id: ScreenId) => {
    return unlockedScreens.includes(id)
  }, [unlockedScreens])

  return (
    <AppStateContext.Provider value={{ unlockedScreens, unlockScreen, isScreenUnlocked, isLoading }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
