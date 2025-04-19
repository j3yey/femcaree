import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import DoctorSidenav from './DoctorSidenav'

export default function DoctorDashboard() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState([])
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    async function fetchDoctorData() {
      try {
        setLoading(true)
        
        // Fetch doctor info
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single()
          
        if (doctorError) throw doctorError
        setDoctorInfo(doctorData)
        
        // Fetch all patients (doctors can see all patients as per your RLS policy)
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*')
          
        if (patientsError) throw patientsError
        setPatients(patientsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    if (user) {
      fetchDoctorData()
    }
  }, [user])
  
  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }
  
  return (
    <div className="app-container">
      <DoctorSidenav onSignOut={signOut} />
      <div className="main-content">
        <div className="dashboard-container">
          <h1>Doctor Dashboard</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="doctor-info">
            <h2>Welcome, Dr. {doctorInfo?.full_name || user?.user_metadata?.full_name || 'Doctor'}</h2>
            {doctorInfo?.specialty && <p>Specialty: {doctorInfo.specialty}</p>}
            <p>Email: {doctorInfo?.email || user?.email}</p>
          </div>
          
          <div className="patients-list">
            <h3>Your Patients ({patients.length})</h3>
            
            {patients.length === 0 ? (
              <p>No patients found in the system.</p>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Registration Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map(patient => (
                      <tr key={patient.id}>
                        <td>{patient.full_name}</td>
                        <td>{patient.email}</td>
                        <td>{patient.phone_number}</td>
                        <td>{new Date(patient.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}