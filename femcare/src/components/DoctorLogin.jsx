// src/components/DoctorLogin.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function DoctorLogin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }
    
    try {
      setLoading(true)
      
      // Sign in with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) throw signInError
      
      // Check if the user is a doctor
      if (data.user.user_metadata.user_type !== 'doctor') {
        throw new Error('This login is only for doctors')
      }
      
      // Navigate to doctor dashboard
      navigate('/doctor-dashboard')
      
    } catch (error) {
      setError(error.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Doctor Login</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <p className="auth-note">
        Doctor accounts are created by administrators.
      </p>
    </div>
  )
}