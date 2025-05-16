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
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'ascending' });

  useEffect(() => {
    fetchPatients();
    const savedState = localStorage.getItem('doctorSidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

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
      setFilteredPatients(data);
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
    setMobileMenuOpen(false);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSignOut = () => {
    console.log("Sign out clicked");
  };

  const handleSidebarToggle = (isCollapsed) => {
    setSidebarCollapsed(isCollapsed);
    localStorage.setItem('doctorSidebarCollapsed', JSON.stringify(isCollapsed));
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedPatients = (patients) => {
    if (!sortConfig.key) return patients;
    
    return [...patients].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;
      
      if (sortConfig.key === 'date_of_birth') {
        const dateA = a[sortConfig.key] ? new Date(a[sortConfig.key]) : null;
        const dateB = b[sortConfig.key] ? new Date(b[sortConfig.key]) : null;
        
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        if (sortConfig.direction === 'ascending') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      }
      
      if (sortConfig.direction === 'ascending') {
        return a[sortConfig.key].toString().localeCompare(b[sortConfig.key].toString());
      } else {
        return b[sortConfig.key].toString().localeCompare(a[sortConfig.key].toString());
      }
    });
  };

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
            patients={getSortedPatients(filteredPatients)} 
            onSelectPatient={handlePatientSelect} 
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClearSearch={clearSearch}
            totalPatients={patients.length}
            requestSort={requestSort}
            sortConfig={sortConfig}
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

function PatientsTable({ patients, onSelectPatient, searchTerm, onSearchChange, onClearSearch, totalPatients, requestSort, sortConfig }) {
  const getSortDirectionIndicator = (columnName) => {
    if (sortConfig.key !== columnName) return '';
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  return (
    <div className="patients-table-container">
      <div className="table-header-section">
        <h1>Patients Data</h1>
        <div className="table-actions">
           </div>
          </div>
        
      
      
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
      
      <div className="table-wrapper">
        <table className="patients-table">
          <thead>
            <tr>
              <th onClick={() => requestSort('full_name')} className="sortable-header">
                Name {getSortDirectionIndicator('full_name')}
              </th>
              <th onClick={() => requestSort('email')} className="sortable-header">
                Email {getSortDirectionIndicator('email')}
              </th>
              <th onClick={() => requestSort('phone_number')} className="sortable-header">
                Phone {getSortDirectionIndicator('phone_number')}
              </th>
              <th onClick={() => requestSort('date_of_birth')} className="sortable-header">
                Date of Birth {getSortDirectionIndicator('date_of_birth')}
              </th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {patients.length > 0 ? (
              patients.map((patient) => (
                <tr key={patient.id} className="patient-row">
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

      <div className="pagination-controls">
        <button className="pagination-btn" disabled>Previous</button>
        <div className="pagination-pages">
          <button className="page-number active">1</button>
          <button className="page-number">2</button>
          <button className="page-number">3</button>
        </div>
        <button className="pagination-btn">Next</button>
      </div>
    </div>
  );
}

function PatientDetailModal({ patient, isOpen, onClose, getAvatarUrl }) {
  const [avatarError, setAvatarError] = useState(false);
  const [activeTab, setActiveTab] = useState('medical');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [resultDescription, setResultDescription] = useState('');
  const [resultType, setResultType] = useState('Laboratory Test');
  const [patientResults, setPatientResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fetch existing results when modal opens or tab changes
  useEffect(() => {
    if (isOpen && activeTab === 'results') {
      fetchPatientResults();
    }
  }, [isOpen, activeTab, patient?.id]);

  useEffect(() => {
    setAvatarError(false);
  }, [patient]);

  const fetchPatientResults = async () => {
    if (!patient?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_results')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPatientResults(data || []);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = [...e.dataTransfer.files];
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = [...e.target.files];
    handleFiles(files);
  };

  const handleFiles = (files) => {
    // Limit to reasonable file size (10MB)
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      alert('Some files were skipped because they exceed the 10MB size limit.');
    }
    
    setSelectedFiles(validFiles);
    
    const newPreviews = validFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to upload');
      return;
    }

    if (!resultType) {
      alert('Please select a result type');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    try {
      // Get current doctor id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (doctorError) throw doctorError;
      if (!doctorData) throw new Error('Doctor record not found');
      
      const doctorId = doctorData.id;
      
      // Process each file
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `${patient.user_id}/${fileName}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('medical-results')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Create database record
        const { error: dbError } = await supabase
          .from('medical_results')
          .insert({
            patient_id: patient.id,
            doctor_id: doctorId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            description: resultDescription,
            result_type: resultType,
          });
        
        if (dbError) throw dbError;
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }
      
      // Reset form and refresh results
      setSelectedFiles([]);
      setPreviews([]);
      setResultDescription('');
      fetchPatientResults();
      
      // Alert success
      alert(`Successfully uploaded ${selectedFiles.length} files for ${patient.full_name}`);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadError(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
    setPreviews([]);
    setResultDescription('');
  };

  const getFileTypeIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('doc')) return '📝';
    return '📎';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getFileUrl = async (filePath) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-results')
        .createSignedUrl(filePath, 60); // URL valid for 60 seconds
      
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error('Error getting file URL:', err);
      return null;
    }
  };

  const handleViewResult = async (result) => {
    const url = await getFileUrl(result.file_path);
    if (url) {
      window.open(url, '_blank');
    } else {
      alert('Could not access file. Please try again later.');
    }
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target.className === 'modal-backdrop') {
      onClose();
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

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
              <div 
                className={`tab ${activeTab === 'medical' ? 'active' : ''}`}
                onClick={() => setActiveTab('medical')}
              >
                Medical Profile
              </div>
              <div 
                className={`tab ${activeTab === 'results' ? 'active' : ''}`}
                onClick={() => setActiveTab('results')}
              >
                Results
              </div>
            </div>
            <div className="tab-content">
              {activeTab === 'medical' ? (
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
              ) : (
                <div className="detail-grid-landscape">
                  <div className="detail-item full-width">
                    <h3>Upload Results</h3>
                    <div className="detail-card-content results-container">
                      <div className="upload-form">
                        <div className="form-row">
                          <label htmlFor="result-type">Result Type:</label>
                          <select 
                            id="result-type" 
                            value={resultType} 
                            onChange={(e) => setResultType(e.target.value)}
                            className="form-select"
                          >
                            <option value="Laboratory Test">Laboratory Test</option>
                            <option value="Imaging">Imaging</option>
                            <option value="Ultrasound">Ultrasound</option>
                            <option value="Pap Smear">Pap Smear</option>
                            <option value="Biopsy">Biopsy</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="form-row">
                          <label htmlFor="result-description">Description:</label>
                          <textarea
                            id="result-description"
                            value={resultDescription}
                            onChange={(e) => setResultDescription(e.target.value)}
                            placeholder="Enter brief description of the result"
                            className="form-textarea"
                          />
                        </div>
                      </div>
                      
                      <div className="results-grid">
                        <div 
                          className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                        >
                          <input
                            type="file"
                            multiple
                            onChange={handleFileInput}
                            accept="image/*,.pdf,.doc,.docx"
                            id="file-input"
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="file-input" className="drop-zone-label">
                            <div className="drop-zone-content">
                              <span className="upload-icon">📁</span>
                              <p>Drag & Drop files here or click to browse</p>
                              <p className="file-types">Supported files: Images, PDF, DOC</p>
                            </div>
                          </label>
                        </div>
                        <div className="preview-zone">
                          {isUploading ? (
                            <div className="upload-progress">
                              <div className="progress-bar">
                                <div 
                                  className="progress-fill" 
                                  style={{ width: `${uploadProgress}%` }}
                                ></div>
                              </div>
                              <p>Uploading... {uploadProgress}%</p>
                              {uploadError && (
                                <div className="upload-error">
                                  {uploadError}
                                </div>
                              )}
                            </div>
                          ) : selectedFiles.length > 0 ? (
                            <div className="preview-content">
                              <h4>Selected Files ({selectedFiles.length})</h4>
                              <div className="preview-grid">
                                {selectedFiles.map((file, index) => (
                                  <div key={index} className="preview-item">
                                    {previews[index] ? (
                                      <img src={previews[index]} alt={`Preview ${index}`} />
                                    ) : (
                                      <div className="file-icon">
                                        {file.name.split('.').pop().toUpperCase()}
                                      </div>
                                    )}
                                    <p className="file-name">{file.name}</p>
                                    <p className="file-size">{formatFileSize(file.size)}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="preview-actions">
                                <button 
                                  className="action-btn primary" 
                                  onClick={handleSubmit}
                                  disabled={isUploading}
                                >
                                  Upload Files
                                </button>
                                <button 
                                  className="action-btn secondary" 
                                  onClick={handleCancel}
                                  disabled={isUploading}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="no-files-message">
                              <p>No files selected</p>
                              <p>Selected files will appear here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="detail-item full-width">
                    <h3>Patient Results</h3>
                    <div className="detail-card-content">
                      {isLoading ? (
                        <div className="loading-spinner-small"></div>
                      ) : patientResults.length > 0 ? (
                        <div className="results-list">
                          <table className="results-table">
                            <thead>
                              <tr>
                                <th>Type</th>
                                <th>Description</th>
                                <th>File</th>
                                <th>Date</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientResults.map((result) => (
                                <tr key={result.id}>
                                  <td>{result.result_type}</td>
                                  <td>{result.description || 'No description'}</td>
                                  <td>
                                    <div className="file-cell">
                                      <span className="file-icon-small">
                                        {getFileTypeIcon(result.file_type)}
                                      </span>
                                      <span className="file-name-small">{result.file_name}</span>
                                    </div>
                                  </td>
                                  <td>{formatDate(result.created_at)}</td>
                                  <td>
                                    <button 
                                      className="view-result-btn"
                                      onClick={() => handleViewResult(result)}
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-results-message">
                          <p>No results found for this patient</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}