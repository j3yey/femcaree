import { useAuth } from '../contexts/AuthContext'
import Sidenav from './Sidenav.jsx'
import Header from './Header';
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  FaCalendarAlt, 
  FaFileAlt, 
  FaUserCircle, 
  FaBell, 
  FaClock, 
  FaDownload, 
  FaChevronRight, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaClipboardList, 
  FaHospital, 
  FaNotesMedical, 
  FaTasks,
  FaInbox,
  FaEnvelope,
  FaEnvelopeOpen,
  FaBars,
  FaPlus,
  FaFlask,
  FaFileDownload,
  FaFileMedical
} from 'react-icons/fa'
import '../styles/PatientDashboard.css'

export default function PatientDashboard() {
  const { user, signOut } = useAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [recentRecords, setRecentRecords] = useState([])
  const [inboxMessages, setInboxMessages] = useState([])
  const [medicalResults, setMedicalResults] = useState([])
  const [combinedInbox, setCombinedInbox] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    return savedState ? JSON.parse(savedState) : false;
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
      if (window.innerWidth > 768) {
        setMenuOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Combine messages and medical results into a single inbox
  useEffect(() => {
    const combined = [
      ...inboxMessages.map(msg => ({ ...msg, type: 'message' })),
      ...medicalResults.map(result => ({ 
        id: result.id,
        from: result.doctor_name || 'Medical Staff',
        subject: `New ${result.result_type} Result`,
        message: result.description || `Your ${result.result_type} results are now available.`,
        time: formatTimeAgo(result.created_at),
        read: result.is_read,
        type: 'medical_result',
        result: result
      }))
    ];
    
    // Sort by creation date (newest first)
    combined.sort((a, b) => {
      const dateA = a.type === 'medical_result' ? new Date(a.result.created_at) : new Date();
      const dateB = b.type === 'medical_result' ? new Date(b.result.created_at) : new Date();
      return dateB - dateA;
    });
    
    setCombinedInbox(combined);
  }, [inboxMessages, medicalResults]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!user) return;
        
        // Fetch upcoming appointments directly using user ID
        // This is the main fix - using user.id directly as patient_id
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select('*, doctors:doctor_id(full_name, specialty, profile_picture_path)')
          .eq('patient_id', user.id)  // Use user.id directly instead of patientId
          .gte('appointment_date', new Date().toISOString().split('T')[0])  // Format date properly for SQL comparison
          .order('appointment_date', { ascending: true })
          .limit(3)

        if (appointmentError) {
          console.error('Error fetching appointments:', appointmentError)
        }

        // Get the patient id for the current user for other queries
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (patientError) {
          console.error('Error fetching patient data:', patientError)
        }
        
        const patientId = patientData?.id;
        
        // Fetch recent medical records
        const { data: records, error: recordsError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)

        if (recordsError) {
          console.error('Error fetching medical records:', recordsError)
        }
        
        // Fetch medical results if patientId exists
        let processedResults = [];
        if (patientId) {
          const { data: results, error: resultsError } = await supabase
            .from('medical_results')
            .select(`
              *,
              doctors:doctor_id (
                full_name
              )
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
            .limit(5)
            
          if (resultsError) {
            console.error('Error fetching medical results:', resultsError)
          } else {
            // Process medical results to include doctor name
            processedResults = results?.map(result => ({
              ...result,
              doctor_name: result.doctors?.full_name || 'Doctor'
            })) || [];
          }
        }
        
        console.log('Fetched appointments:', appointments)
        
        setUpcomingAppointments(appointments || [])
        setRecentRecords(records || [])
        setInboxMessages([])
        setMedicalResults(processedResults)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const markResultAsRead = async (resultId) => {
    try {
      const { data, error } = await supabase
        .from('medical_results')
        .update({ is_read: true })
        .eq('id', resultId)
        .select()
      
      if (error) throw error;
      
      // Update the medical results state
      setMedicalResults(prevResults => 
        prevResults.map(result => 
          result.id === resultId ? { ...result, is_read: true } : result
        )
      );
    } catch (error) {
      console.error('Error marking result as read:', error);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen)
  }

  if (loading) {
    return (
      <div className="dashboard-container flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return formatDate(dateString);
    }
  };

  const getInitials = (name) => {
    if (!name) return "DR";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
  }

  const getUnreadCount = () => {
    return combinedInbox.filter(item => !item.read).length;
  };

  const getResultTypeIcon = (resultType) => {
    switch (resultType?.toLowerCase()) {
      case 'lab':
        return <FaFlask />;
      case 'imaging':
        return <FaFileMedical />;
      default:
        return <FaFileAlt />;
    }
  };

  return (
    <div className="app-container">
        <Header 
            isSidebarCollapsed={isSidebarCollapsed} 
            menuOpen={menuOpen}
        />
        <div className="app-layout">
            <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${menuOpen ? 'mobile-visible' : ''}`}>
                <Sidenav 
                    onSignOut={handleSignOut}
                    onCollapsedChange={(collapsed) => setIsSidebarCollapsed(collapsed)}
                />
            </div>
            <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Welcome Section */}
                <div className="welcome-section">
                  <h1 className="welcome-title">
                    Welcome back, {user?.user_metadata?.full_name || 'Patient'}! 👋
                  </h1>
                  <p className="welcome-subtitle">
                    Your health journey is our priority. Here's your latest updates.
                  </p>
                  <div className="welcome-stats">
                    <div className="welcome-stat">
                      <h3>{upcomingAppointments.length}</h3>
                      <p>Upcoming<br />Appointments</p>
                    </div>
                    <div className="welcome-stat">
                      <h3>{recentRecords.length}</h3>
                      <p>Recent<br />Records</p>
                    </div>
                    <div className="welcome-stat">
                      <h3>{getUnreadCount()}</h3>
                      <p>Unread<br />Messages</p>
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {/* Left Column */}
                  <div className="dashboard-column">
                    {/* Quick Actions */}
                    <div className="quick-action-section">
                      <h2 className="section-title">Quick Actions</h2>
                      <div className="quick-action-grid">
                        <QuickActionCard 
                          icon={<FaCalendarAlt />}
                          title="Schedule Appointment"
                          description="Book your next visit"
                          color="#ec4899"
                          link="/book-appointment"
                        />
                        <QuickActionCard 
                          icon={<FaFileAlt />}
                          title="Medical Records"
                          description="View your health history"
                          color="#be185d"
                          link="/medical-records"
                        />
                      </div>
                    </div>

                    {/* Recent Records */}
                    <div className="dashboard-card">
                      <div className="dashboard-card-header">
                        <h2><FaFileAlt className="card-header-icon" /> Recent Medical Records</h2>
                        <a href="/medical-records" className="view-all">View All <FaChevronRight size={12} /></a>
                      </div>
                      <div className="card-content">
                        {recentRecords.length > 0 ? (
                          recentRecords.map((record) => (
                            <div key={record.id} className="record-card">
                              <div className="record-info">
                                <h4 className="record-name">{record.file_name}</h4>
                                <div className="record-date">
                                  <FaCalendarAlt size={12} className="record-icon" />
                                  <span>{new Date(record.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <a 
                                href={record.public_url}
                                className="view-button"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <FaDownload size={14} />
                                View
                              </a>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            <FaFileAlt className="empty-icon" />
                            <p>No medical records found</p>
                            <a href="/upload-records" className="empty-state-button">
                              <FaPlus size={12} /> Upload Records
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="dashboard-column">
                    {/* Next Appointment Preview */}
                    <div className="dashboard-card upcoming-appointment-card">
                      <div className="dashboard-card-header">
                        <h2><FaCalendarAlt className="card-header-icon" /> Upcoming Appointments</h2>
                        <a href="/appointments" className="view-all">View All <FaChevronRight size={12} /></a>
                      </div>
                      <div className="card-content">
                        {upcomingAppointments.length > 0 ? (
                          upcomingAppointments.map((appointment, index) => (
                            <div key={appointment.id} className="appointment-card">
                              <div className="appointment-doctor">
                                <div className="card-icon" style={{ background: "#be185d" }}>
                                  {appointment.doctors?.profile_picture_path ? (
                                    <img 
                                      src={appointment.doctors.profile_picture_path} 
                                      alt={appointment.doctors.full_name}
                                    />
                                  ) : (
                                    <span>{getInitials(appointment.doctors?.full_name)}</span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="doctor-name">
                                    {appointment.doctors?.full_name || "Doctor"}
                                  </h4>
                                  <p className="doctor-specialty">{appointment.doctors?.specialty || "Specialist"}</p>
                                </div>
                              </div>
                              <div className="appointment-datetime">
                                <div className="date">
                                  <FaCalendarAlt className="icon" />
                                  <span>{formatDate(appointment.appointment_date)}</span>
                                </div>
                                <div className="time">
                                  <FaClock className="icon" />
                                  <span>{appointment.start_time}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            <FaCalendarAlt className="empty-icon" />
                            <p>No upcoming appointments</p>
                            <a href="/book-appointment" className="empty-state-button">
                              <FaPlus size={12} /> Book Appointment
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inbox with Medical Results */}
                    <div className="dashboard-card">
                      <div className="dashboard-card-header">
                        <h2><FaInbox className="card-header-icon" /> Inbox</h2>
                        <a href="/inbox" className="view-all">View All <FaChevronRight size={12} /></a>
                      </div>
                      <div className="card-content">
                        {combinedInbox.length > 0 ? (
                          combinedInbox.map((item) => (
                            <div 
                              key={`${item.type}-${item.id}`} 
                              className={`inbox-message ${!item.read ? 'unread' : ''}`}
                              onClick={() => {
                                if (item.type === 'medical_result' && !item.read) {
                                  markResultAsRead(item.id);
                                }
                              }}
                            >
                              <div className="inbox-message-icon">
                                {item.type === 'medical_result' ? 
                                  getResultTypeIcon(item.result.result_type) : 
                                  (item.read ? <FaEnvelopeOpen /> : <FaEnvelope />)
                                }
                              </div>
                              <div className="inbox-message-content">
                                <div className="inbox-message-header">
                                  <h4>{item.from}</h4>
                                  <span className="inbox-message-time">{item.time}</span>
                                </div>
                                <h5 className="inbox-message-subject">
                                  {item.subject}
                                  {item.type === 'medical_result' && !item.read && (
                                    <span className="new-badge">New</span>
                                  )}
                                </h5>
                                <p className="inbox-message-preview">{item.message}</p>
                                {item.type === 'medical_result' && (
                                  <div className="inbox-message-actions">
                                    <a 
                                      href={item.result.file_path}
                                      className="view-result-button"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!item.read) markResultAsRead(item.id);
                                      }}
                                    >
                                      <FaFileDownload size={12} />
                                      View Result
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            <FaInbox className="empty-icon" />
                            <p>No messages in your inbox</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            {/* Add overlay for mobile */}
            <div 
                className={`mobile-overlay ${menuOpen ? 'visible' : ''}`}
                onClick={() => setMenuOpen(false)}
            />
        </div>
        
        <button 
            className="mobile-sidebar-toggle"
            onClick={toggleMenu}
            aria-label="Toggle sidebar"
        >
            <FaBars />
        </button>
    </div>
  )
}

function QuickActionCard({ icon, title, description, color, link }) {
  return (
    <a href={link} className="quick-action-card">
      <div 
        className="card-icon"
        style={{ background: color }}
      >
        {icon}
      </div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>
      </div>
    </a>
  )
}