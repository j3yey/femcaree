// src/components/PatientRegistration.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function PatientRegistration() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    
    if (!email || !password || !fullName || !phoneNumber) {
      setError('Please fill in all fields')
      return
    }
    
    try {
      setLoading(true)
      
      // First, create the user in Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phoneNumber,
            user_type: 'patient'
          }
        }
      })
      
      if (signUpError) throw signUpError
      
      setMessage('Registration successful! Redirecting to login...')
      
      // Clear the form
      setEmail('')
      setPassword('')
      setFullName('')
      setPhoneNumber('')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        navigate('/patient-login')
      }, 2000)
      
    } catch (error) {
      setError(error.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <h2>Patient Registration</h2>
      
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="fullName">Full Name</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        
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
          <label htmlFor="phoneNumber">Phone Number</label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter your phone number"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
          />
        </div>
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Processing...' : 'Register'}
        </button>
      </form>
      
      <p className="auth-link">
        Already have an account? <a href="/patient-login">Log in</a>
      </p>
    </div>
  )
}