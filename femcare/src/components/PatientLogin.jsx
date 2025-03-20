// src/components/PatientLogin.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import '../styles/PatientLogin.css'

export default function PatientLogin() {
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
      
      // Check if the user is a patient
      if (data.user.user_metadata.user_type !== 'patient') {
        throw new Error('This login is only for patients')
      }
      
      // Check if patient record exists
      const { data: existingPatient, error: fetchError } = await supabase
  .from('patients')
  .select('*')
  .eq('user_id', data.user.id)
  .maybeSingle()  // Use maybeSingle() instead of single()
      
      // If there's no patient record yet, create one
      if (!existingPatient) {
        const { error: insertError } = await supabase
          .from('patients')
          .insert([
            { 
              user_id: data.user.id, 
              full_name: data.user.user_metadata.full_name || 'Unknown', 
              email: data.user.email, 
              phone_number: data.user.user_metadata.phone || 'Not provided' 
            }
          ])
        
        if (insertError) {
          console.error('Error creating patient record:', insertError)
          setError('Failed to create patient profile. Please contact support.')
          return
        }
      }
      
      // Navigate to patient dashboard
      navigate('/patient-dashboard')
      
    } catch (error) {
      setError(error.message || 'Failed to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Patient Login</h2>
      
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
      
      <p className="auth-link">
        Don't have an account? <a href="/patient-register">Register</a>
      </p>
    </div>
  )
}