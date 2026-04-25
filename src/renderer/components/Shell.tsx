import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />
      <main className="ml-64 pt-[73px] min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
