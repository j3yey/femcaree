import React, { useState, useEffect } from 'react';
import DoctorSidenav from './DoctorSidenav';
import Header from './Header';
import { supabase } from '../supabaseClient';
import '../styles/PatientsData.css';

export default function PatientsData() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchPatients();
    // Check initial sidebar state from localStorage
    const savedState = localStorage.getItem('doctorSidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Filter patients when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const searchTermLower = searchTerm.toLowerCase();
      const filtered = patients.filter(patient => 
        patient.full_name?.toLowerCase().includes(searchTermLower) ||
        patient.email?.toLowerCase().includes(searchTermLower) ||
        patient.phone_number?.toLowerCase().includes(searchTermLower) ||
        (patient.date_of_birth && new Date(patient.date_of_birth).toLocaleDateString().includes(searchTerm))
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select(`
          id,
          user_id,
          full_name,
          email,
          phone_number,
          date_of_birth,
          pregnancies_count,
          live_births_count,
          last_menstrual_period,
          known_allergies,
          current_medications,
          gynecological_conditions,
          last_pap_smear,
          last_pap_smear_result,
          profile_picture_path
        `);

      if (error) throw error;
      setPatients(data);
      setFilteredPatients(data); // Initialize filtered patients with all patients
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setModalOpen(true);
    // Close mobile menu when selecting a patient
    setMobileMenuOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSignOut = () => {
    // Implement sign out logic here
    console.log("Sign out clicked");
  };

  const handleSidebarToggle = (isCollapsed) => {
    setSidebarCollapsed(isCollapsed);
    // Save preference to localStorage
    localStorage.setItem('doctorSidebarCollapsed', JSON.stringify(isCollapsed));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Close mobile menu when clicking on backdrop
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Updated getAvatarUrl function to exactly match the working version in PatientAppointments
  const getAvatarUrl = (profilePicturePath) => {
    if (!profilePicturePath) return null;
    return supabase.storage
      .from('avatars')
      .getPublicUrl(profilePicturePath)
      .data.publicUrl;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading patient data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <DoctorSidenav 
        onSignOut={handleSignOut}
        onSidebarToggle={handleSidebarToggle}
        isCollapsed={sidebarCollapsed}
        isMobileOpen={mobileMenuOpen}
      />
      {/* Add backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu-backdrop" onClick={closeMobileMenu}></div>
      )}
      <div className={`main-content ${sidebarCollapsed ? 'content-expanded' : ''}`}>
        <Header 
          isSidebarCollapsed={sidebarCollapsed} 
          onMobileMenuToggle={toggleMobileMenu} 
        />
        <div className="content fade-in">
          <PatientsTable 
            patients={filteredPatients} 
            onSelectPatient={handlePatientSelect} 
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearSearch={clearSearch}
            totalPatients={patients.length}
          />
          
          {selectedPatient && (
            <PatientDetailModal 
              patient={selectedPatient} 
              isOpen={modalOpen}
              onClose={closeModal}
              getAvatarUrl={getAvatarUrl} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PatientsTable({ patients, onSelectPatient, searchTerm, onSearchChange, onClearSearch, totalPatients }) {
  return (
    <div className="patients-table-container">
      <h1>Patients Data</h1>
      
      <div className="search-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Search patients by name, email or phone..."
            value={searchTerm}
            onChange={onSearchChange}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search-btn" onClick={onClearSearch}>
              ×
            </button>
          )}
        </div>
        <div className="search-results-count">
          {patients.length === totalPatients 
            ? `Showing all ${totalPatients} patients`
            : `Found ${patients.length} of ${totalPatients} patients`}
        </div>
      </div>
      
      <table className="patients-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Date of Birth</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {patients.length > 0 ? (
            patients.map((patient) => (
              <tr key={patient.id}>
                <td>{patient.full_name}</td>
                <td>{patient.email}</td>
                <td>{patient.phone_number}</td>
                <td>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'Not recorded'}</td>
                <td>
                  <button 
                    onClick={() => onSelectPatient(patient)}
                    className="view-details-btn"
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No patients found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PatientDetailModal({ patient, isOpen, onClose, getAvatarUrl }) {
  const [avatarError, setAvatarError] = useState(false);
  
  useEffect(() => {
    // Reset states when patient changes
    setAvatarError(false);
  }, [patient]);
  
  if (!isOpen) return null;

  // Close modal when clicking outside the modal content
  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-backdrop') {
      onClose();
    }
  };

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Handle image error
  const handleImageError = () => {
    console.error("Avatar image failed to load");
    setAvatarError(true);
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <button onClick={onClose} className="modal-close-btn">×</button>
        </div>
        <div className="modal-body">
          <div className="patient-profile-header">
            <div className="patient-avatar-container">
              {patient.profile_picture_path && !avatarError ? (
                <img 
                  src={getAvatarUrl(patient.profile_picture_path)} 
                  alt={`${patient.full_name}'s avatar`} 
                  className="patient-avatar"
                  onError={handleImageError}
                />
              ) : (
                <div className="patient-avatar-fallback">
                  {getInitials(patient.full_name)}
                </div>
              )}
            </div>
            <div className="patient-basic-info">
              <h2>{patient.full_name}</h2>
              <p className="patient-id">Patient ID: {patient.id.substring(0, 8)}</p>
              <div className="patient-contact">
                <div className="contact-item">
                  <i className="contact-icon">✉️</i>
                  <span>{patient.email}</span>
                </div>
                <div className="contact-item">
                  <i className="contact-icon">📞</i>
                  <span>{patient.phone_number}</span>
                </div>
                <div className="contact-item">
                  <i className="contact-icon">🎂</i>
                  <span>{patient.date_of_birth ? new Date(patient.date_of_birth).toLocaleDateString() : 'Not recorded'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="patient-tabs">
            <div className="tabs-header">
              <div className="tab active">Medical Profile</div>
              <div className="tab">Appointments</div>
              <div className="tab">Records</div>
            </div>
            <div className="tab-content">
              <div className="detail-grid-landscape">
                <div className="detail-item">
                  <h3>Reproductive History</h3>
                  <div className="detail-card-content">
                    <div className="detail-stat">
                      <span className="stat-value">{patient.pregnancies_count || 0}</span>
                      <span className="stat-label">Pregnancies</span>
                    </div>
                    <div className="detail-stat">
                      <span className="stat-value">{patient.live_births_count || 0}</span>
                      <span className="stat-label">Live Births</span>
                    </div>
                    <div className="detail-info">
                      <span className="info-label">Last Period:</span>
                      <span className="info-value">{patient.last_menstrual_period ? 
                        new Date(patient.last_menstrual_period).toLocaleDateString() : 'Not recorded'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <h3>Screening History</h3>
                  <div className="detail-card-content">
                    <div className="detail-info">
                      <span className="info-label">Last Pap Smear:</span>
                      <span className="info-value">{patient.last_pap_smear ? 
                        new Date(patient.last_pap_smear).toLocaleDateString() : 'Not recorded'}</span>
                    </div>
                    <div className="detail-info">
                      <span className="info-label">Result:</span>
                      <span className="info-value result-tag">
                        {patient.last_pap_smear_result || 'Not recorded'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <h3>Allergies & Medications</h3>
                  <div className="detail-card-content scrollable">
                    <div className="detail-section">
                      <h4>Known Allergies</h4>
                      <p>{patient.known_allergies || 'No known allergies'}</p>
                    </div>
                    <div className="detail-section">
                      <h4>Current Medications</h4>
                      <p>{patient.current_medications || 'No current medications'}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <h3>Gynecological Conditions</h3>
                  <div className="detail-card-content scrollable">
                    <p>{patient.gynecological_conditions || 'No conditions recorded'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button className="action-btn secondary">Schedule Appointment</button>
            <button className="action-btn primary">Update Records</button>
          </div>
        </div>
      </div>
    </div>
  );
}