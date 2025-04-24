import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import DoctorSidenav from './DoctorSidenav';
import '../styles/PatientRecords.css';
import Header from './Header';
import { FaExclamationCircle, FaDownload, FaFileMedical, FaChevronRight } from 'react-icons/fa';

export default function PatientRecords() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState(window.innerWidth < 768);
  const [showPatientsList, setShowPatientsList] = useState(true);
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
          .select('*');
        
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
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError('Failed to load patient data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPatients();
  }, []);

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
                Back to List
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
                  <h2 className="panel-title">Patients</h2>
                  <div className="patients-scroll-container">
                    {patients.map((patient) => (
                      <div 
                        key={patient.id} 
                        className={`patient-list-item ${selectedPatient?.id === patient.id ? 'selected' : ''}`}
                        onClick={() => handlePatientSelect(patient)}
                      >
                        <div className="patient-list-info">
                          <h3>{patient.full_name}</h3>
                          <p>{patient.email}</p>
                          <p className="phone-number">{patient.phone_number}</p>
                        </div>
                        <div className="patient-list-meta">
                          <span className="record-badge">{patient.records.length} record(s)</span>
                          <FaChevronRight className="chevron-right" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Patient Details Panel */}
              {(!mobileView || (mobileView && selectedPatient && !showPatientsList)) && (
                <div className="patient-details-container">
                  {selectedPatient ? (
                    <>
                      <div className="details-header">
                        <h2 className="panel-title">{selectedPatient.full_name}'s Records</h2>
                        <div className="patient-summary">
                          <p>{selectedPatient.email} • {selectedPatient.phone_number}</p>
                          <span className="dob-label">DOB: {selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'Not provided'}</span>
                        </div>
                      </div>
                      
                      <div className="details-content">
                        <div className="medical-summary">
                          <h3>Patient Overview</h3>
                          <div className="medical-grid">
                            <div className="medical-item">
                              <span className="medical-label">Pregnancies</span>
                              <span className="medical-value">{selectedPatient.pregnancies_count || 0}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">Live Births</span>
                              <span className="medical-value">{selectedPatient.live_births_count || 0}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">Last Menstrual Period</span>
                              <span className="medical-value">{selectedPatient.last_menstrual_period ? new Date(selectedPatient.last_menstrual_period).toLocaleDateString() : 'Not provided'}</span>
                            </div>
                            <div className="medical-item">
                              <span className="medical-label">Last Pap Smear</span>
                              <span className="medical-value">{selectedPatient.last_pap_smear ? new Date(selectedPatient.last_pap_smear).toLocaleDateString() : 'Not provided'}</span>
                            </div>
                          </div>
                          
                          <div className="medical-notes">
                            <div className="note-item">
                              <h4>Allergies</h4>
                              <p>{selectedPatient.known_allergies || 'None reported'}</p>
                            </div>
                            <div className="note-item">
                              <h4>Current Medications</h4>
                              <p>{selectedPatient.current_medications || 'None reported'}</p>
                            </div>
                            <div className="note-item">
                              <h4>Gynecological Conditions</h4>
                              <p>{selectedPatient.gynecological_conditions || 'None reported'}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="records-container">
                          <h3>Medical Records</h3>
                          
                          {selectedPatient.records.length === 0 ? (
                            <div className="empty-records">
                              <FaFileMedical className="empty-icon-small" />
                              <p className="no-records">No records available</p>
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
                                  {selectedPatient.records.map((record) => (
                                    <tr key={record.id}>
                                      <td>{record.file_name}</td>
                                      <td className="hide-on-mobile">{record.file_type}</td>
                                      <td className="hide-on-mobile">{formatFileSize(record.file_size)}</td>
                                      <td>{new Date(record.created_at).toLocaleDateString()}</td>
                                      <td>
                                        <button
                                          className="download-button"
                                          onClick={() => downloadRecord(record.file_path, record.file_name)}
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