// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function ProtectedRoute({ children, requiredRole }) {
  const { user, isPatient, isDoctor, loading } = useAuth()
  
  if (loading) {
    return <div>Loading...</div>
  }
  
  if (!user) {
    return <Navigate to="/" />
  }
  
  if (requiredRole === 'patient' && !isPatient) {
    return <Navigate to="/unauthorized" />
  }
  
  if (requiredRole === 'doctor' && !isDoctor) {
    return <Navigate to="/unauthorized" />
  }
  
  return children
}