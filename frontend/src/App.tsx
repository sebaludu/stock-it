import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import AssetForm from './pages/AssetForm'
import AssetTypes from './pages/AssetTypes'
import Movements from './pages/Movements'
import Users from './pages/Users'
import Reports from './pages/Reports'
import Deposits from './pages/Deposits'

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="assets" element={<Assets />} />
          <Route path="assets/new" element={<ProtectedRoute adminOnly><AssetForm /></ProtectedRoute>} />
          <Route path="assets/:id" element={<AssetDetail />} />
          <Route path="assets/:id/edit" element={<ProtectedRoute adminOnly><AssetForm /></ProtectedRoute>} />
          <Route path="asset-types" element={<ProtectedRoute adminOnly><AssetTypes /></ProtectedRoute>} />
          <Route path="movements" element={<Movements />} />
          <Route path="deposits" element={<ProtectedRoute adminOnly><Deposits /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
