import { HashRouter, useRoutes } from 'react-router-dom'
import { AppStateProvider } from '@/hooks/useAppState'
import { routes } from '@/router'

function AppRoutes() {
  return useRoutes(routes)
}

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppStateProvider>
  )
}
