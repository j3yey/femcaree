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
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const { user } = useAuth()

  useEffect(() => {
    const savedState = localStorage.getItem('doctorSidebarCollapsed')
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState))
    }
    
    // Check for saved view mode preference
    const savedViewMode = localStorage.getItem('appointmentsViewMode')
    if (savedViewMode) {
      setViewMode(savedViewMode)
    }
  }, [])

  // Save view mode preference when it changes
  useEffect(() => {
    localStorage.setItem('appointmentsViewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true)
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
        const patientName = appointment.patients?.full_name.toLowerCase() || ''
        const appointmentDate = appointment.appointment_date ? 
          format(new Date(appointment.appointment_date), 'MMMM d, yyyy').toLowerCase() : ''
        const searchLower = searchTerm.toLowerCase()
        const reasonForVisit = appointment.reason ? appointment.reason.toLowerCase() : ''
        const appointmentCategory = appointment.appointment_category ? appointment.appointment_category.toLowerCase() : ''
        const appointmentType = appointment.appointment_type ? appointment.appointment_type.toLowerCase() : ''
        
        return patientName.includes(searchLower) || 
               appointmentDate.includes(searchLower) ||
               reasonForVisit.includes(searchLower) ||
               appointmentCategory.includes(searchLower) ||
               appointmentType.includes(searchLower)
      })
      setFilteredAppointments(filtered)
      
      // Auto-select first filtered appointment
      if (filtered.length > 0) {
        setSelectedAppointment(filtered[0])
      } else {
        setSelectedAppointment(null)
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
              const patientName = appointment.patients?.full_name.toLowerCase() || ''
              const appointmentDate = appointment.appointment_date ?
                format(new Date(appointment.appointment_date), 'MMMM d, yyyy').toLowerCase() : ''
              const searchLower = searchTerm.toLowerCase()
              const reasonForVisit = appointment.reason ? appointment.reason.toLowerCase() : ''
              const appointmentCategory = appointment.appointment_category ? appointment.appointment_category.toLowerCase() : ''
              const appointmentType = appointment.appointment_type ? appointment.appointment_type.toLowerCase() : ''
              
              return patientName.includes(searchLower) || 
                     appointmentDate.includes(searchLower) ||
                     reasonForVisit.includes(searchLower) ||
                     appointmentCategory.includes(searchLower) ||
                     appointmentType.includes(searchLower)
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
    if (!profilePicturePath) return null;
    try {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(profilePicturePath);
      return data?.publicUrl || null;
    } catch (error) {
      console.error('Error getting avatar URL:', error);
      return null;
    }
  }

  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleSearch = (event) => {
    setSearchTerm(event.target.value)
  }

  const getStatusBadgeClass = (status) => {
    return `status-badge ${status}`
  }

  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'grid' ? 'list' : 'grid')
  }
  
  const sortAppointments = (appointments) => {
    // Group appointments by date
    const groupedByDate = {}
    
    appointments.forEach(apt => {
      const dateKey = apt.appointment_date
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = []
      }
      groupedByDate[dateKey].push(apt)
    })
    
    return groupedByDate
  }

  const formatAppointmentTime = (startTime, endTime) => {
    return `${format(new Date(`2000-01-01T${startTime}`), 'h:mm a')} - ${format(new Date(`2000-01-01T${endTime}`), 'h:mm a')}`
  }

  const groupedAppointments = sortAppointments(filteredAppointments)

  // Function to get category-based styling
  const getCategoryClass = (category) => {
    if (!category) return "category-default";
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("prenatal") || categoryLower.includes("pregnancy")) {
      return "category-prenatal";
    } else if (categoryLower.includes("annual") || categoryLower.includes("routine") || categoryLower.includes("checkup")) {
      return "category-annual";
    } else if (categoryLower.includes("emergency") || categoryLower.includes("urgent")) {
      return "category-emergency";
    } else if (categoryLower.includes("follow") || categoryLower.includes("review")) {
      return "category-followup";
    } else if (categoryLower.includes("procedure") || categoryLower.includes("surgery")) {
      return "category-procedure";
    } else {
      return "category-default";
    }
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
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading appointments...</div>
          </div>
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
        
        <div className="appointments-header">
          <div className="header-left">
            <h1 className="appointments-title">Patient Appointments</h1>
            <div className="appointment-count">
              {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
            </div>
          </div>
        
          <div className="header-right">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by patient name, date, or reason..."
                value={searchTerm}
                onChange={handleSearch}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <button 
              className="view-toggle-btn" 
              onClick={toggleViewMode}
              title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            >
              {viewMode === 'grid' ? '≡' : '◫'}
            </button>
          </div>
        </div>
        
        <div className="appointments-layout">
          <div className="appointments-box-container">
            {Object.keys(groupedAppointments).length > 0 ? (
              <div className={viewMode === 'grid' ? 'appointments-grid' : 'appointments-list'}>
                {Object.keys(groupedAppointments).sort().map(date => (
                  <div key={date} className="appointment-date-group">
                    <div className="appointment-date-header">
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </div>
                    
                    <div className={viewMode === 'grid' ? 'appointment-cards-grid' : 'appointment-cards-list'}>
                      {groupedAppointments[date].map((appointment) => (
                        <div 
                          key={appointment.id} 
                          className={`appointment-card ${selectedAppointment?.id === appointment.id ? 'selected' : ''} ${appointment.status}`}
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
                                <div className="appointment-info-header">
                                  <h3 className="patient-name">
                                    {appointment.patients?.full_name}
                                  </h3>
                                  <span className={getStatusBadgeClass(appointment.status)}>
                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                  </span>
                                </div>
                                <div className="appointment-time">
                                  <span className="time-slot">
                                    {formatAppointmentTime(appointment.start_time, appointment.end_time)}
                                  </span>
                                  {appointment.reason && viewMode === 'list' && (
                                    <div className="appointment-reason">
                                      {appointment.reason.length > 60 
                                        ? `${appointment.reason.substring(0, 60)}...` 
                                        : appointment.reason
                                      }
                                    </div>
                                  )}
                                </div>
                                {appointment.appointment_category && viewMode === 'list' && (
                                  <div className={`appointment-category-tag ${getCategoryClass(appointment.appointment_category)}`}>
                                    {appointment.appointment_category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-appointments">
                <div className="no-appointments-icon">📅</div>
                <h3>{searchTerm ? "No appointments found matching your search" : "No appointments found"}</h3>
                <p>{searchTerm ? "Try using different search terms" : "You don't have any upcoming appointments"}</p>
              </div>
            )}
          </div>


          <div className={`appointment-details-container ${selectedAppointment ? 'show' : ''}`}>
            {selectedAppointment ? (
              <div className="appointment-details">
                <div className="details-header">
                  <h2>Patient Information</h2>
                  <button 
                    className="close-details"
                    onClick={() => setSelectedAppointment(null)}
                    aria-label="Close details"
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
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"%3e%3ccircle cx="60" cy="60" r="60" fill="%23FF69B4" opacity="0.2"/%3e%3ctext x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="48" font-weight="bold" fill="%23FF69B4"%3e' + selectedAppointment.patients?.full_name.charAt(0).toUpperCase() + '%3c/text%3e%3c/svg%3e';
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '50%'
                          }}
                        />
                      ) : (
                        <div className="large-avatar-placeholder">
                          <span className="large-avatar-initial">
                            {selectedAppointment.patients?.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="patient-main-info">
                      <h3>{selectedAppointment.patients?.full_name}</h3>
                      <div className="patient-contact-info">
                        <div className="contact-info-item">
                          <span className="contact-icon">✉️</span>
                          <span>{selectedAppointment.patients?.email}</span>
                        </div>
                        <div className="contact-info-item">
                          <span className="contact-icon">📱</span>
                          <span>{selectedAppointment.patients?.phone_number}</span>
                        </div>
                        <div className="contact-info-item">
                          <span className="contact-icon">🎂</span>
                          <span>{selectedAppointment.patients?.date_of_birth ? 
                            format(new Date(selectedAppointment.patients.date_of_birth), 'MMMM d, yyyy') : 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="appointment-details-section">
                    <h4 className="section-title">
                      <span className="section-icon">📅</span>
                      Appointment Details
                    </h4>
                    <div className="detail-row">
                      <span className="detail-label">Date</span>
                      <span className="detail-value highlight">
                        {format(new Date(selectedAppointment.appointment_date), 'EEEE, MMMM d, yyyy')}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Time</span>
                      <span className="detail-value highlight">
                        {formatAppointmentTime(selectedAppointment.start_time, selectedAppointment.end_time)}
                      </span>
                    </div>
                    
                    {/* New Category and Type section */}
                    {(selectedAppointment.appointment_category || selectedAppointment.appointment_type) && (
                      <>
                        <div className="detail-row">
                          <span className="detail-label">Category</span>
                          <span className={`detail-value category-tag ${getCategoryClass(selectedAppointment.appointment_category)}`}>
                            {selectedAppointment.appointment_category || 'Not specified'}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Type</span>
                          <span className="detail-value type-tag">
                            {selectedAppointment.appointment_type || 'Not specified'}
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="detail-row">
                      <span className="detail-label">Status</span>
                      <div className="status-update-container">
                        <select
                          className={`status-select status-${selectedAppointment.status}`}
                          value={selectedAppointment.status}
                          onChange={(e) => handleStatusUpdate(selectedAppointment.id, e.target.value)}
                          disabled={updatingStatus}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <span className={getStatusBadgeClass(selectedAppointment.status)}>
                          {selectedAppointment.status.charAt(0).toUpperCase() + 
                           selectedAppointment.status.slice(1)}
                        </span>
                        {updatingStatus && <div className="status-updating-indicator"></div>}
                      </div>
                    </div>
                    {updateError && (
                      <div className="error-message">
                        {updateError}
                      </div>
                    )}
                  </div>

                  {selectedAppointment.reason && (
                    <div className="reason-section">
                      <h4 className="section-title">
                        <span className="section-icon">📝</span>
                        Reason for Visit
                      </h4>
                      <div className="reason-content">
                        {selectedAppointment.reason}
                      </div>
                    </div>
                  )}

                  <div className="medical-info-section">
                    <h4 className="section-title">
                      <span className="section-icon">🩺</span>
                      Medical Information
                    </h4>
                    <div className="medical-info-grid">
                      <div className="info-card">
                        <h5 className="info-card-title">Allergies</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.known_allergies || 'None reported'}
                        </div>
                      </div>
                      <div className="info-card">
                        <h5 className="info-card-title">Medications</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.current_medications || 'None reported'}
                        </div>
                      </div>
                      <div className="info-card">
                        <h5 className="info-card-title">Last Menstrual Period</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.last_menstrual_period ? 
                            format(new Date(selectedAppointment.patients.last_menstrual_period), 'MMMM d, yyyy') : 'Not provided'}
                        </div>
                      </div>
                      <div className="info-card">
                        <h5 className="info-card-title">Pregnancies / Live Births</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.pregnancies_count || '0'} / {selectedAppointment.patients?.live_births_count || '0'}
                        </div>
                      </div>
                      <div className="info-card">
                        <h5 className="info-card-title">Last Pap Smear</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.last_pap_smear ? 
                            format(new Date(selectedAppointment.patients.last_pap_smear), 'MMMM d, yyyy') : 'Not provided'}
                        </div>
                      </div>
                      <div className="info-card">
                        <h5 className="info-card-title">Pap Smear Result</h5>
                        <div className="info-card-content">
                          {selectedAppointment.patients?.last_pap_smear_result || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-selection-message">
                <div className="no-selection-icon">👆</div>
                <h3>No appointment selected</h3>
                <p>Select an appointment from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}