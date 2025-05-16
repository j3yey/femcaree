import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DoctorSidenav from './DoctorSidenav';
import '../styles/PatientRecords.css';
import Header from './Header';
import { 
  FaUser, 
  FaExclamationCircle, 
  FaDownload, 
  FaFileMedical, 
  FaChevronRight, 
  FaSearch, 
  FaPhone, 
  FaCalendarAlt, 
  FaNotesMedical, 
  FaAllergies, 
  FaPills, 
  FaFemale, 
  FaFileAlt,
  FaArrowLeft
} from 'react-icons/fa';

// Add this function before the PatientRecords component
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
};

export default function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState(window.innerWidth < 768);
  const [showPatientsList, setShowPatientsList] = useState(true);
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);
  const navigate = useNavigate();

  // Handler for sidebar toggle
  const handleSidebarToggle = (isCollapsed) => {
    setSidebarCollapsed(isCollapsed);
    document.body.classList.toggle('sidebar-collapsed', isCollapsed);
  };

  // Handler for sign out
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
      alert('Error signing out');
    }
  };

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setMobileView(isMobile);
      if (!isMobile) {
        setShowPatientsList(true);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    // Apply full screen to HTML and body
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('resize', handleResize);
      // Clean up styles when component unmounts
      document.documentElement.style.height = '';
      document.body.style.height = '';
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    async function fetchPatients() {
      try {
        setLoading(true);
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select(`
            *,
            profile_picture_path
          `);
        
        if (patientsError) throw patientsError;
        
        const patientsWithRecords = [];
        
        for (const patient of patientsData) {
          const { data: recordsData, error: recordsError } = await supabase
            .from('medical_records')
            .select('*')
            .eq('user_id', patient.user_id);
            
          if (recordsError) throw recordsError;
          
          patientsWithRecords.push({
            ...patient,
            records: recordsData || []
          });
        }
        
        setPatients(patientsWithRecords);
        setFilteredPatients(patientsWithRecords);
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPatients();
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient => 
        patient.full_name.toLowerCase().includes(term) ||
        patient.email.toLowerCase().includes(term) ||
        (patient.phone_number && patient.phone_number.toLowerCase().includes(term))
      );
      setFilteredPatients(filtered);
    }
  };

  const handleRecordSearchChange = (e) => {
    const term = e.target.value.toLowerCase();
    setRecordSearchTerm(term);
    
    if (!selectedPatient) return;
    
    if (term.trim() === '') {
      setFilteredRecords(selectedPatient.records);
    } else {
      const filtered = selectedPatient.records.filter(record => 
        record.file_name.toLowerCase().includes(term) ||
        record.file_type.toLowerCase().includes(term)
      );
      setFilteredRecords(filtered);
    }
  };

  const handleClearRecordSearch = () => {
    setRecordSearchTerm('');
    if (selectedPatient) {
      setFilteredRecords(selectedPatient.records);
    }
  };

  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    if (mobileView) {
      setShowPatientsList(false);
    }
  };

  const handleBackToList = () => {
    setShowPatientsList(true);
  };

  const downloadRecord = async (filePath, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('records')
        .download(filePath);
        
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      alert('Failed to download file');
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setFilteredPatients(patients);
  };

  useEffect(() => {
    if (selectedPatient) {
      setFilteredRecords(selectedPatient.records);
    }
  }, [selectedPatient]);

  return (
    <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <DoctorSidenav 
        onSignOut={handleSignOut}
        onSidebarToggle={handleSidebarToggle}
        isCollapsed={sidebarCollapsed}
      />
      <div className="main-container">
        <Header isSidebarCollapsed={sidebarCollapsed} />
        <div className="content">
          <div className="content-header">
            <h1>Patient Records</h1>
            {mobileView && selectedPatient && !showPatientsList && (
              <button className="back-button" onClick={handleBackToList}>
                <FaArrowLeft />
                <span>Back to List</span>
              </button>
            )}
          </div>
          
          {loading && (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading patients data...</p>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <FaExclamationCircle className="error-icon" />
              {error}
            </div>
          )}
          
          {!loading && !error && patients.length === 0 && (
            <div className="empty-state">
              <FaFileMedical className="empty-icon" />
              <p className="no-data">No patients found.</p>
            </div>
          )}
          
          {!loading && !error && patients.length > 0 && (
            <div className="two-panel-layout">
              {/* Patients List Panel */}
              {(showPatientsList || !mobileView) && (
                <div className="patients-list-container">
                  <h2 className="panel-title">
                    <FaUser />
                    <span>Patients</span>
                  </h2>
                  
                  {/* Search bar */}
                  <div className="search-container">
                    <div className="search-input-wrapper">
                      <FaSearch className="search-icon" />
                      <input
                        type="text"
                        className="search-input"
                        placeholder="Search patients..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        aria-label="Search patients"
                      />
                      {searchTerm && (
                        <button 
                          className="clear-search" 
                          onClick={handleClearSearch}
                          aria-label="Clear search"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="patients-scroll-container">
                    {filteredPatients.length === 0 ? (
                      <div className="no-search-results">
                        <p>No patients match your search.</p>
                      </div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <div 
                          key={patient.id} 
                          className={`patient-list-item ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                          onClick={() => handlePatientSelect(patient)}
                        >
                          <div className="patient-list-info">
                            <div className="patient-list-avatar">
                              {patient.profile_picture_path ? (
                                <img
                                  src={getAvatarUrl(patient.profile_picture_path)}
                                  alt={patient.full_name}
                                  className="avatar-image"
                                />
                              ) : (
                                <div className="avatar-placeholder">
                                  <span className="avatar-initial">
                                    {patient.full_name.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="patient-info-text">
                              <h3>{patient.full_name}</h3>
                              <p>{patient.email}</p>
                              <p className="phone-number">
                                <FaPhone />
                                <span>{patient.phone_number || 'No phone number'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="patient-list-meta">
                            <span className="record-badge">
                              <FaFileAlt />
                              <span>{patient.records.length} record(s)</span>
                            </span>
                            <FaChevronRight className="chevron-right" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {/* Patient Details Panel */}
              {(!mobileView || (mobileView && selectedPatient && !showPatientsList)) && (
                <div className="patient-details-container">
                  {selectedPatient ? (
                    <>
                      <div className="details-header">
                        <h2 className="panel-title">
                          <FaFileMedical />
                          <span>{selectedPatient.full_name}'s Records</span>
                        </h2>
                        <div className="patient-summary">
                          <p>
                            <FaUser />
                            <span>{selectedPatient.email}</span>
                            {selectedPatient.phone_number && (
                              <>
                                {' • '}
                                <FaPhone />
                                <span>{selectedPatient.phone_number}</span>
                              </>
                            )}
                          </p>
                          <span className="dob-label">
                            <FaCalendarAlt />
                            <span>DOB: {selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                          </span>
                        </div>
                      </div>
                      
                      <div className="details-content">
                        <div className="medical-summary">
                          <h3>
                            <FaNotesMedical />
                            <span>Patient Overview</span>
                          </h3>
                          <div className="medical-grid">
                            <div className="medical-item">
                              <span className="medical-label">
                                <FaFemale />
                                <span>Pregnancies</span>
                              </span>
                              <span className="medical-value">{selectedPatient.pregnancies_count || 0}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">
                                <FaFemale />
                                <span>Live Births</span>
                              </span>
                              <span className="medical-value">{selectedPatient.live_births_count || 0}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">
                                <FaCalendarAlt />
                                <span>Last Menstrual Period</span>
                              </span>
                              <span className="medical-value">{selectedPatient.last_menstrual_period ? new Date(selectedPatient.last_menstrual_period).toLocaleDateString() : 'Not provided'}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">
                                <FaCalendarAlt />
                                <span>Last Pap Smear</span>
                              </span>
                              <span className="medical-value">{selectedPatient.last_pap_smear ? new Date(selectedPatient.last_pap_smear).toLocaleDateString() : 'Not provided'}</span>
                            </div>
                          </div>
                          
                          <div className="medical-notes">
                            <div className="note-item">
                              <h4>
                                <FaAllergies />
                                <span>Allergies</span>
                              </h4>
                              <p>{selectedPatient.known_allergies || 'None reported'}</p>
                            </div>
                            <div className="note-item">
                              <h4>
                                <FaPills />
                                <span>Current Medications</span>
                              </h4>
                              <p>{selectedPatient.current_medications || 'None reported'}</p>
                            </div>
                            <div className="note-item">
                              <h4>
                                <FaFemale />
                                <span>Gynecological Conditions</span>
                              </h4>
                              <p>{selectedPatient.gynecological_conditions || 'None reported'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="records-container">
                          <div className="records-header">
                            <h3>
                              <FaFileAlt />
                              <span>Medical Records</span>
                            </h3>
                            <div className="search-container">
                              <div className="search-input-wrapper">
                                <FaSearch className="search-icon" />
                                <input
                                  type="text"
                                  className="search-input"
                                  placeholder="Search records..."
                                  value={recordSearchTerm}
                                  onChange={handleRecordSearchChange}
                                  aria-label="Search records"
                                />
                                {recordSearchTerm && (
                                  <button 
                                    className="clear-search" 
                                    onClick={handleClearRecordSearch}
                                    aria-label="Clear search"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {selectedPatient.records.length === 0 ? (
                            <div className="empty-records">
                              <FaFileMedical className="empty-icon-small" />
                              <p className="no-records">No records available</p>
                            </div>
                          ) : filteredRecords.length === 0 ? (
                            <div className="empty-records">
                              <p className="no-records">No records match your search.</p>
                            </div>
                          ) : (
                            <div className="table-container">
                              <table>
                                <thead>
                                  <tr>
                                    <th>File Name</th>
                                    <th className="hide-on-mobile">Type</th>
                                    <th className="hide-on-mobile">Size</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredRecords.map((record) => (
                                    <tr key={record.id}>
                                      <td>{record.file_name}</td>
                                      <td className="hide-on-mobile">{record.file_type}</td>
                                      <td className="hide-on-mobile">{formatFileSize(record.file_size)}</td>
                                      <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                      <td>
                                        <button
                                          className="download-button"
                                          onClick={() => downloadRecord(record.file_path, record.file_name)}
                                          aria-label="Download record"
                                        >
                                          <FaDownload className="download-icon" />
                                          <span className="hide-on-small">Download</span>
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="no-selection">
                      <FaFileMedical className="no-selection-icon" />
                      <p>Select a patient to view their medical records</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}