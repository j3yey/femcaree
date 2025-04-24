import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import Header from './Header';
import Sidenav from './Sidenav';
import { FaCamera, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import '../styles/Profile.css';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    date_of_birth: '',
    phone_number: '',
    profile_picture: null,
    last_menstrual_period: '',
    pregnancies_count: 0,
    live_births_count: 0,
    known_allergies: '',
    current_medications: '',
    gynecological_conditions: '',
    last_pap_smear: '',
    last_pap_smear_result: ''
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profileData);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentDateTime = '2025-04-19 19:46:45';
  const currentUser = 'j3yey';

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const handleSidebarCollapse = (collapsed) => {
    setIsSidebarCollapsed(collapsed);
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Fetch patient data
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        throw patientError;
      }

      if (patientData) {
        const updatedData = {
          ...profileData,
          ...patientData
        };
        setProfileData(updatedData);
        setFormData(updatedData);

        // If there's a profile picture path, get its URL
        if (patientData.profile_picture_path) {
          const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(patientData.profile_picture_path);
          
          setProfileData(prev => ({ ...prev, profile_picture: publicUrl }));
          setFormData(prev => ({ ...prev, profile_picture: publicUrl }));
        }
      }

    } catch (error) {
      setError('Error fetching profile data');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);

        // Create a unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        // Upload the file to Supabase storage
        const { error: uploadError, data } = await supabase
          .storage
          .from('avatars')
          .upload(fileName, file, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get the public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(fileName);

        // Update the profile picture path in the patients table
        const { error: updateError } = await supabase
          .from('patients')
          .update({
            profile_picture_path: fileName
          })
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        setFormData(prev => ({
          ...prev,
          profile_picture: publicUrl
        }));
        setPreviewUrl(URL.createObjectURL(file));

      } catch (error) {
        setError('Error uploading image');
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('patients')
        .update({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          phone_number: formData.phone_number,
          last_menstrual_period: formData.last_menstrual_period,
          pregnancies_count: formData.pregnancies_count,
          live_births_count: formData.live_births_count,
          known_allergies: formData.known_allergies,
          current_medications: formData.current_medications,
          gynecological_conditions: formData.gynecological_conditions,
          last_pap_smear: formData.last_pap_smear,
          last_pap_smear_result: formData.last_pap_smear_result
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfileData(formData);
      setIsEditing(false);
      
    } catch (error) {
      setError('Error updating profile');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      <Header isSidebarCollapsed={isSidebarCollapsed} />
      <div className="app-layout">
        <Sidenav onCollapsedChange={handleSidebarCollapse} />
        <div className="main-content">
          <div className="profile-main">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          
          <div className="profile-header">
              <div className="profile-picture-section">
                <div className="profile-picture-container">
                  <img 
                    src={previewUrl || formData.profile_picture || '/default-avatar.png'} 
                    alt="Profile" 
                    className="profile-picture" 
                  />
                  {isEditing && (
                    <div className="profile-picture-upload">
                      <label htmlFor="profilePicture" className="upload-label">
                        <FaCamera className="camera-icon" />
                        <span>Change Photo</span>
                      </label>
                      <input
                        type="file"
                        id="profilePicture"
                        name="profilePicture"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden-input"
                      />
                    </div>
                  )}
                </div>
              </div>
              <h1>Patient Profile</h1>
              <div className="datetime-display">
                Current Date and Time (UTC): {currentDateTime}
              </div>
              <div className="user-info">
                User: {currentUser}
              </div>
            </div>
          
          <form onSubmit={handleSubmit} className="profile-grid">
            {/* Basic Information Section */}
            <div className="profile-section">
              <h2>Basic Information</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.full_name || 'Not provided'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="date_of_birth">Date of Birth</label>
                  {isEditing ? (
                    <input
                      type="date"
                      id="date_of_birth"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.date_of_birth || 'Not provided'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="phone_number">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.phone_number || 'Not provided'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="last_menstrual_period">Last Menstrual Period</label>
                  {isEditing ? (
                    <input
                      type="date"
                      id="last_menstrual_period"
                      name="last_menstrual_period"
                      value={formData.last_menstrual_period}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.last_menstrual_period || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Medical History Section */}
            <div className="profile-section">
              <h2>Medical History</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label htmlFor="pregnancies_count">Number of Pregnancies</label>
                  {isEditing ? (
                    <input
                      type="number"
                      id="pregnancies_count"
                      name="pregnancies_count"
                      value={formData.pregnancies_count}
                      onChange={handleInputChange}
                      min="0"
                    />
                  ) : (
                    <p>{profileData.pregnancies_count}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="live_births_count">Number of Live Births</label>
                  {isEditing ? (
                    <input
                      type="number"
                      id="live_births_count"
                      name="live_births_count"
                      value={formData.live_births_count}
                      onChange={handleInputChange}
                      min="0"
                    />
                  ) : (
                    <p>{profileData.live_births_count}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="known_allergies">Known Allergies</label>
                  {isEditing ? (
                    <textarea
                      id="known_allergies"
                      name="known_allergies"
                      value={formData.known_allergies}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.known_allergies || 'None reported'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="current_medications">Current Medications</label>
                  {isEditing ? (
                    <textarea
                      id="current_medications"
                      name="current_medications"
                      value={formData.current_medications}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.current_medications || 'None reported'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="gynecological_conditions">Gynecological Conditions</label>
                  {isEditing ? (
                    <textarea
                      id="gynecological_conditions"
                      name="gynecological_conditions"
                      value={formData.gynecological_conditions}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.gynecological_conditions || 'None reported'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Screening History Section */}
            <div className="profile-section">
              <h2>Screening History</h2>
              <div className="info-grid">
                <div className="form-group">
                  <label htmlFor="last_pap_smear">Last Pap Smear Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      id="last_pap_smear"
                      name="last_pap_smear"
                      value={formData.last_pap_smear}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.last_pap_smear || 'Not provided'}</p>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="last_pap_smear_result">Last Pap Smear Result</label>
                  {isEditing ? (
                    <input
                      type="text"
                      id="last_pap_smear_result"
                      name="last_pap_smear_result"
                      value={formData.last_pap_smear_result}
                      onChange={handleInputChange}
                    />
                  ) : (
                    <p>{profileData.last_pap_smear_result || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </form>

          <div className="form-actions">
            {isEditing ? (
              <>
                <button 
                  type="button" 
                  className="save-button" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  className="cancel-button"
                  onClick={() => {
                    setFormData(profileData);
                    setIsEditing(false);
                    setPreviewUrl(null);
                  }}
                  disabled={loading}
                >
                  <FaTimes /> Cancel
                </button>
              </>
            ) : (
              <button 
                type="button"
                className="edit-profile-button"
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                <FaEdit /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}