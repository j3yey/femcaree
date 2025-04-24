import { useAuth } from '../contexts/AuthContext'
import Sidenav from './Sidenav.jsx'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { FaCalendarAlt, FaFileAlt, FaUserCircle, FaBell, FaClock, FaDownload } from 'react-icons/fa'
import '../styles/PatientDashboard.css'

export default function PatientDashboard() {
  const { user, signOut } = useAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [recentRecords, setRecentRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch upcoming appointments
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select('*, doctors(full_name, specialty)')
          .eq('patient_id', user.id)
          .gte('appointment_date', new Date().toISOString())
          .order('appointment_date', { ascending: true })
          .limit(3)

        if (appointmentError) throw appointmentError

        // Fetch recent medical records
        const { data: records, error: recordsError } = await supabase
          .from('medical_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3)

        if (recordsError) throw recordsError

        setUpcomingAppointments(appointments || [])
        setRecentRecords(records || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  if (loading) {
    return (
      <div className="dashboard-container flex items-center justify-center">
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Sidenav onSignOut={signOut} />
      
      <div className="p-6 ml-64">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.user_metadata?.full_name || 'Patient'}! 👋
          </h1>
          <p className="text-white/80">
            Your health journey is our priority. Here's your latest updates.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="quick-action-grid">
          <QuickActionCard 
            icon={<FaCalendarAlt />}
            title="Schedule Appointment"
            description="Book your next visit"
            color="#4f46e5"
            link="/book-appointment"
          />
          <QuickActionCard 
            icon={<FaFileAlt />}
            title="Medical Records"
            description="View your health history"
            color="#059669"
            link="/medical-records"
          />
          <QuickActionCard 
            icon={<FaUserCircle />}
            title="Update Profile"
            description="Manage your information"
            color="#7c3aed"
            link="/profile"
          />
          <QuickActionCard 
            icon={<FaBell />}
            title="Notifications"
            description="Stay up to date"
            color="#eab308"
            link="/notifications"
          />
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-grid">
          {/* Upcoming Appointments */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Upcoming Appointments</h2>
              <FaClock className="text-gray-400" />
            </div>
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((appointment) => (
                <AppointmentCard key={appointment.id} appointment={appointment} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No upcoming appointments
              </p>
            )}
          </div>

          {/* Recent Records */}
          <div className="dashboard-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Recent Medical Records</h2>
              <FaFileAlt className="text-gray-400" />
            </div>
            {recentRecords.length > 0 ? (
              recentRecords.map((record) => (
                <RecordCard key={record.id} record={record} />
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">
                No medical records found
              </p>
            )}
          </div>
        </div>
      </div>
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
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </a>
  )
}

function AppointmentCard({ appointment }) {
  return (
    <div className="appointment-card">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-lg">
            Dr. {appointment.doctors?.full_name}
          </h4>
          <p className="text-gray-600">{appointment.doctors?.specialty}</p>
          <div className="flex items-center gap-2 mt-2">
            <FaCalendarAlt className="text-gray-400" />
            <span className="text-sm">
              {new Date(appointment.appointment_date).toLocaleDateString()}
            </span>
            <span className="text-sm text-gray-400">•</span>
            <span className="text-sm">{appointment.appointment_time}</span>
          </div>
        </div>
        <span className={`status-badge ${appointment.status}`}>
          {appointment.status}
        </span>
      </div>
    </div>
  )
}

function RecordCard({ record }) {
  return (
    <div className="record-card">
      <div>
        <h4 className="font-semibold">{record.file_name}</h4>
        <p className="text-sm text-gray-600">
          {new Date(record.created_at).toLocaleDateString()}
        </p>
      </div>
      <a 
        href={record.public_url}
        className="view-button flex items-center gap-2"
        target="_blank"
        rel="noopener noreferrer"
      >
        <FaDownload size={14} />
        View
      </a>
    </div>
  )
}