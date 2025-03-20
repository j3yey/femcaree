// src/components/DoctorDashboard.jsx
import { useAuth } from '../contexts/AuthContext'

export default function DoctorDashboard() {
  const { user, signOut } = useAuth()
  
  return (
    <div className="dashboard-container">
      <h1>Doctor Dashboard</h1>
      <p>Welcome, Dr. {user?.user_metadata?.full_name || 'Doctor'}</p>
      
      <div className="dashboard-actions">
        <button onClick={signOut} className="logout-button">Sign Out</button>
      </div>
    </div>
  )
}