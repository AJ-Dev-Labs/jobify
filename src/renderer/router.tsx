import { Navigate, type RouteObject } from 'react-router-dom'
import { useAppState } from '@/hooks/useAppState'
import Shell from '@/components/Shell'
import SetupScreen from '@/screens/SetupScreen'
import UploadScreen from '@/screens/UploadScreen'
import SkillsScreen from '@/screens/SkillsScreen'
import JobsScreen from '@/screens/JobsScreen'
import type { ScreenId } from '@shared/types'
import type { ReactNode } from 'react'

function ScreenGuard({ screenId, children }: { screenId: ScreenId; children: ReactNode }) {
  const { isScreenUnlocked } = useAppState()

  if (!isScreenUnlocked(screenId)) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/setup" replace /> },
      { path: 'setup', element: <SetupScreen /> },
      {
        path: 'upload',
        element: (
          <ScreenGuard screenId="upload">
            <UploadScreen />
          </ScreenGuard>
        ),
      },
      {
        path: 'skills',
        element: (
          <ScreenGuard screenId="skills">
            <SkillsScreen />
          </ScreenGuard>
        ),
      },
      {
        path: 'jobs',
        element: (
          <ScreenGuard screenId="jobs">
            <JobsScreen />
          </ScreenGuard>
        ),
      },
    ],
  },
]
