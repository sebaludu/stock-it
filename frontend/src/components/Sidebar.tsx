import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Monitor, ArrowLeftRight, Users, BarChart3 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/assets', icon: Monitor, label: 'Activos' },
  { to: '/movements', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/users', icon: Users, label: 'Usuarios', adminOnly: true },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const visibleLinks = links.filter((l) => !l.adminOnly || user?.role === 'ADMIN')

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold text-indigo-400">Stock IT</h1>
        <p className="text-xs text-gray-400 mt-1">GEASA</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {visibleLinks.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
