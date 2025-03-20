// src/components/Home.jsx
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Home() {
  const { user, isPatient, isDoctor } = useAuth()
  
  return (
    <div className="home-container">
      <h1>Medical Portal</h1>
      
      {user ? (
        <div className="welcome-container">
          <h2>Welcome Back!</h2>
          {isPatient && (
            <Link to="/patient-dashboard" className="auth-button">
              Go to Patient Dashboard
            </Link>
          )}
          {isDoctor && (
            <Link to="/doctor-dashboard" className="auth-button">
              Go to Doctor Dashboard
            </Link>
          )}
        </div>
      ) : (
        <div className="auth-options">
          <div className="auth-option">
            <h2>For Patients</h2>
            <p>Access your medical records, appointments, and more.</p>
            <div className="auth-buttons">
              <Link to="/patient-login" className="auth-button">
                Patient Login
              </Link>
              <Link to="/patient-register" className="auth-button secondary">
                Register as Patient
              </Link>
            </div>
          </div>
          
          <div className="auth-option">
            <h2>For Doctors</h2>
            <p>Access patient information, schedules, and medical records.</p>
            <Link to="/doctor-login" className="auth-button">
              Doctor Login
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}