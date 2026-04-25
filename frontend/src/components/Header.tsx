import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { LogOut, User } from 'lucide-react'

export default function Header() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User size={16} />
          <span className="font-medium">{user?.full_name}</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
            {user?.role === 'ADMIN' ? 'Administrador' : 'Soporte IT'}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Salir
        </button>
      </div>
    </header>
  )
}
