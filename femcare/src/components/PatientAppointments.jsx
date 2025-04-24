import React, { useEffect, useState } from 'react'
import DoctorSidenav from './DoctorSidenav'
import Header from './Header'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import '../styles/PatientAppointments.css'
import { format } from 'date-fns'

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState([])
  const [filteredAppointments, setFilteredAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updateError, setUpdateError] = useState(null)
  const { user } = useAuth()

  useEffect(() => {
    const savedState = localStorage.getItem('doctorSidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
  }, [])

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            patients:patient_id (
              full_name,
              email,
              profile_picture_path,
                date_of_birth,
              phone_number,
              known_allergies,
              current_medications,
              last_menstrual_period,
              pregnancies_count,
              live_births_count,
              last_pap_smear,
              last_pap_smear_result
            )
          `)
          .eq('doctor_id', user.id)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })

        if (error) throw error

        setAppointments(data)
        setFilteredAppointments(data)
        if (data && data.length > 0) {
          setSelectedAppointment(data[0])
        }
      } catch (error) {
        console.error('Error fetching appointments:', error.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchAppointments()
    }
  }, [user])

  // Filter appointments when search term changes
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredAppointments(appointments)
    } else {
      const filtered = appointments.filter(appointment => {
        const patientName = appointment.patients?.full_name.toLowerCase()
        const appointmentDate = format(new Date(appointment.appointment_date), 'MMMM d, yyyy').toLowerCase()
        const searchLower = searchTerm.toLowerCase()
        
        return patientName.includes(searchLower) || appointmentDate.includes(searchLower)
      })
      setFilteredAppointments(filtered)
      
      // Auto-select first filtered appointment
      if (filtered.length > 0) {
        setSelectedAppointment(filtered[0])
      }
    }
  }, [searchTerm, appointments])

  
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    setUpdatingStatus(true)
    setUpdateError(null)
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus,
        })
        .eq('id', appointmentId)
        .select(`
          *,
          patients:patient_id (
            full_name,
            email,
            profile_picture_path,
            date_of_birth,
            phone_number,
            known_allergies,
            current_medications,
            last_menstrual_period,
            pregnancies_count,
            live_births_count,
            last_pap_smear,
            last_pap_smear_result
          )
        `)
        .single()

      if (error) throw error

      // Update the appointments list and selected appointment
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId ? data : apt
      )
      
      setAppointments(updatedAppointments)
      setFilteredAppointments(
        searchTerm === '' 
          ? updatedAppointments 
          : updatedAppointments.filter(appointment => {
              const patientName = appointment.patients?.full_name.toLowerCase()
              const appointmentDate = format(new Date(appointment.appointment_date), 'MMMM d, yyyy').toLowerCase()
              const searchLower = searchTerm.toLowerCase()
              return patientName.includes(searchLower) || appointmentDate.includes(searchLower)
            })
      )
      setSelectedAppointment(data)

    } catch (error) {
      console.error('Error updating appointment status:', error.message)
      setUpdateError('Failed to update appointment status. Please try again.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed)
  }

  const handleSignOut = () => {
    // Implement sign out functionality here
  }

  const getAvatarUrl = (profilePicturePath) => {
    if (!profilePicturePath) return null
    return supabase.storage
      .from('avatars')
      .getPublicUrl(profilePicturePath)
      .data.publicUrl
  }

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  if (loading) {
    return (
      <div className={`appointments-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <DoctorSidenav 
          onSignOut={handleSignOut}
          onSidebarToggle={handleSidebarToggle}
          isCollapsed={sidebarCollapsed}
        />
        <Header isSidebarCollapsed={sidebarCollapsed} />
        <div className="appointments-content">
          <div className="loading-state">Loading appointments...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`appointments-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <DoctorSidenav 
        onSignOut={handleSignOut}
        onSidebarToggle={handleSidebarToggle}
        isCollapsed={sidebarCollapsed}
      />
      <Header isSidebarCollapsed={sidebarCollapsed} />
      <div className="appointments-content">
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by patient name or date..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
        </div>
        
        
        <div className="appointments-layout">
          <div className="appointments-box-container">
            <div className="appointments-grid">
              {filteredAppointments.map((appointment) => (
                <div 
                  key={appointment.id} 
                  className={`appointment-card ${selectedAppointment?.id === appointment.id ? 'selected' : ''}`}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <div className="appointment-card-content">
                    <div className="appointment-header">
                      <div className="avatar-container">
                        {appointment.patients?.profile_picture_path ? (
                          <img
                            src={getAvatarUrl(appointment.patients.profile_picture_path)}
                            alt={appointment.patients.full_name}
                            className="avatar-image"
                          />
                        ) : (
                          <div className="avatar-placeholder">
                            <span className="avatar-initial">
                              {appointment.patients?.full_name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="appointment-info">
                        <h3 className="patient-name">
                          {appointment.patients?.full_name}
                        </h3>
                        <div className="appointment-time">
                          <span>
                            {format(new Date(appointment.appointment_date), 'MMMM d, yyyy')}
                          </span>
                          <span>
                            {format(new Date(`2000-01-01T${appointment.start_time}`), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

{filteredAppointments.length === 0 && (
                <div className="no-appointments">
                  {searchTerm ? "No appointments found matching your search" : "No appointments found"}
                </div>
              )}
            </div>
          </div>


          <div className={`appointment-details-container ${selectedAppointment ? 'show' : ''}`}>
  {selectedAppointment ? (
    <div className="appointment-details">
      <div className="details-header">
        <h2>Patient Information</h2>
        <button 
          className="close-details"
          onClick={() => setSelectedAppointment(null)}
        >
          ×
        </button>
      </div>

      <div className="patient-details-card">
        <div className="patient-header">
          <div className="large-avatar">
            {selectedAppointment.patients?.profile_picture_path ? (
              <img
                src={getAvatarUrl(selectedAppointment.patients.profile_picture_path)}
                alt={selectedAppointment.patients.full_name}
                className="large-avatar-image"
              />
            ) : (
              <div className="large-avatar-placeholder">
                <span className="large-avatar-initial">
                  {selectedAppointment.patients?.full_name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="patient-main-info">
            <h3>{selectedAppointment.patients?.full_name}</h3>
            <p>Email: {selectedAppointment.patients?.email}</p>
            <p>Phone: {selectedAppointment.patients?.phone_number}</p>
            <p>Date of Birth: {selectedAppointment.patients?.date_of_birth ? 
              format(new Date(selectedAppointment.patients.date_of_birth), 'MMMM d, yyyy') : 'Not provided'}</p>
          </div>
        </div>

        <div className="appointment-details-section">
          <h4 className="section-title">Appointment Details</h4>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">
              {format(new Date(selectedAppointment.appointment_date), 'MMMM d, yyyy')}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Time</span>
            <span className="detail-value">
              {format(new Date(`2000-01-01T${selectedAppointment.start_time}`), 'h:mm a')} - 
              {format(new Date(`2000-01-01T${selectedAppointment.end_time}`), 'h:mm a')}
            </span>
          </div>
          <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <div className="status-update-container">
                      <select
                        className="status-select"
                        value={selectedAppointment.status}
                        onChange={(e) => handleStatusUpdate(selectedAppointment.id, e.target.value)}
                        disabled={updatingStatus}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <span className={`status-badge ${selectedAppointment.status}`}>
                        {selectedAppointment.status.charAt(0).toUpperCase() + 
                         selectedAppointment.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  {updateError && (
                    <div className="error-message">
                      {updateError}
                    </div>
                  )}
                </div>

        <div className="medical-info-section">
          <h4 className="section-title">Medical Information</h4>
          <div className="detail-row">
            <span className="detail-label">Known Allergies</span>
            <span className="detail-value">{selectedAppointment.patients?.known_allergies || 'None reported'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Current Medications</span>
            <span className="detail-value">{selectedAppointment.patients?.current_medications || 'None reported'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last Menstrual Period</span>
            <span className="detail-value">
              {selectedAppointment.patients?.last_menstrual_period ? 
                format(new Date(selectedAppointment.patients.last_menstrual_period), 'MMMM d, yyyy') : 'Not provided'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Pregnancies</span>
            <span className="detail-value">{selectedAppointment.patients?.pregnancies_count || '0'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Live Births</span>
            <span className="detail-value">{selectedAppointment.patients?.live_births_count || '0'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last Pap Smear</span>
            <span className="detail-value">
              {selectedAppointment.patients?.last_pap_smear ? 
                format(new Date(selectedAppointment.patients.last_pap_smear), 'MMMM d, yyyy') : 'Not provided'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Pap Smear Result</span>
            <span className="detail-value">{selectedAppointment.patients?.last_pap_smear_result || 'Not provided'}</span>
          </div>
        </div>

        {selectedAppointment.reason && (
          <div className="reason-section">
            <h4 className="section-title">Reason for Visit</h4>
            <div className="detail-row">
              <span className="detail-value">{selectedAppointment.reason}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : (
    <div className="no-selection-message">
      <p>Select an appointment to view details</p>
    </div>
  )}
</div>
        </div>
      </div>
    </div>
  )
}