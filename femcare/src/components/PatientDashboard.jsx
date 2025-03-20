// src/components/PatientDashboard.jsx
import { useAuth } from '../contexts/AuthContext'
import Sidenav from './Sidenav.jsx';

export default function PatientDashboard() {
  const { user, signOut } = useAuth()
  
  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <Sidenav onSignOut={signOut} />
      
      <h1>Patient Dashboard</h1>
      <p>Welcome, {user?.user_metadata?.full_name || 'Patient'}</p>
      <p>Phone: {user?.user_metadata?.phone || 'Not provided'}</p>
      
      <div className="dashboard-actions">
        <button onClick={signOut} className="logout-button">Sign Out</button>
      </div>
    </div>
  )
}
