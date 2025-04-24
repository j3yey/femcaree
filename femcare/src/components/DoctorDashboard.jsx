import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../supabaseClient'
import DoctorSidenav from './DoctorSidenav'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line, Doughnut, Bar } from 'react-chartjs-2'
import '../styles/DoctorDashboard.css'
import Header from './Header'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

export default function DoctorDashboard() {
  const { user, signOut } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [patients, setPatients] = useState([])
  const [doctorInfo, setDoctorInfo] = useState(null)
  const [todaysAppointments, setTodaysAppointments] = useState([])
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0
  })
  const [appointmentStats, setAppointmentStats] = useState({
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [error, setError] = useState(null)
  
  // New state variables for advanced statistics
  const [patientAgeGroups, setPatientAgeGroups] = useState({
    under18: 0,
    '18-25': 0,
    '26-35': 0,
    '36-45': 0,
    over45: 0
  })
  const [commonConditions, setCommonConditions] = useState([])
  const [completionRate, setCompletionRate] = useState(0)
  const [averageDuration, setAverageDuration] = useState(0)
  const [monthlyAppointments, setMonthlyAppointments] = useState({
    labels: [],
    data: []
  })

  // Handle sidebar state - persist in localStorage for user preference
  useEffect(() => {
    const savedState = localStorage.getItem('doctorSidebarCollapsed')
    if (savedState !== null) {
      const collapsedState = JSON.parse(savedState)
      setIsSidebarCollapsed(collapsedState)
      // Apply the class to body when component mounts
      document.body.classList.toggle('sidebar-collapsed', collapsedState)
    }
  }, [])

  // Updated sidebar toggle handler - saves to localStorage and updates body class
  const handleSidebarToggle = (collapsed) => {
    setIsSidebarCollapsed(collapsed)
    localStorage.setItem('doctorSidebarCollapsed', JSON.stringify(collapsed))
    // Toggle the class on body for global layout changes
    document.body.classList.toggle('sidebar-collapsed', collapsed)
  }

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true)
        const today = new Date().toISOString().split('T')[0]

        // Fetch doctor info
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (doctorError) throw doctorError
        setDoctorInfo(doctorData)

        // Fetch today's appointments
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            patients (
              full_name,
              phone_number,
              email
            )
          `)
          .eq('doctor_id', user.id)
          .eq('appointment_date', today)
          .order('start_time', { ascending: true })

        if (appointmentsError) throw appointmentsError
        setTodaysAppointments(appointments)

        // Fetch all patients with their date of birth
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('*, date_of_birth, gynecological_conditions')

        if (patientsError) throw patientsError
        setPatients(patientsData)

        // Process patient age demographics
        const ageGroups = {
          under18: 0,
          '18-25': 0,
          '26-35': 0,
          '36-45': 0,
          over45: 0
        }

        // Process conditions from patients
        const conditionsMap = {}

        patientsData.forEach(patient => {
          // Calculate age if date_of_birth exists
          if (patient.date_of_birth) {
            const birthDate = new Date(patient.date_of_birth)
            const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
            
            if (age < 18) ageGroups.under18++
            else if (age >= 18 && age <= 25) ageGroups['18-25']++
            else if (age >= 26 && age <= 35) ageGroups['26-35']++
            else if (age >= 36 && age <= 45) ageGroups['36-45']++
            else ageGroups.over45++
          }

          // Count gynecological conditions
          if (patient.gynecological_conditions) {
            const conditions = patient.gynecological_conditions.split(',').map(c => c.trim())
            conditions.forEach(condition => {
              if (condition) {
                conditionsMap[condition] = (conditionsMap[condition] || 0) + 1
              }
            })
          }
        })

        setPatientAgeGroups(ageGroups)

        // Get top 5 conditions
        const sortedConditions = Object.entries(conditionsMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }))
        
        setCommonConditions(sortedConditions)

        // Fetch appointment statistics
        const { data: allAppointments, error: statsError } = await supabase
          .from('appointments')
          .select('status, start_time, end_time, appointment_date')
          .eq('doctor_id', user.id)

        if (statsError) throw statsError

        // Calculate appointment statistics
        const stats = allAppointments.reduce((acc, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1
          return acc
        }, {})

        setAppointmentStats({
          pending: stats.pending || 0,
          confirmed: stats.confirmed || 0,
          cancelled: stats.cancelled || 0,
          completed: stats.completed || 0
        })

        // Set overall statistics
        setStats({
          totalPatients: patientsData.length,
          todayAppointments: appointments.length,
          completedAppointments: stats.completed || 0,
          pendingAppointments: stats.pending || 0
        })

        // Calculate completion rate
        const totalNonCancelled = (stats.completed || 0) + (stats.pending || 0) + (stats.confirmed || 0)
        const completionRate = totalNonCancelled > 0 
          ? Math.round((stats.completed || 0) / totalNonCancelled * 100) 
          : 0
        
        setCompletionRate(completionRate)

        // Calculate average appointment duration
        let totalDuration = 0
        let appointmentsWithDuration = 0

        allAppointments.forEach(appointment => {
          if (appointment.start_time && appointment.end_time) {
            const start = new Date(`2000-01-01T${appointment.start_time}`)
            const end = new Date(`2000-01-01T${appointment.end_time}`)
            const durationMinutes = (end - start) / (1000 * 60)
            
            if (durationMinutes > 0) {
              totalDuration += durationMinutes
              appointmentsWithDuration++
            }
          }
        })

        const avgDuration = appointmentsWithDuration > 0 
          ? Math.round(totalDuration / appointmentsWithDuration) 
          : 0
        
        setAverageDuration(avgDuration)

        // Calculate monthly appointments for the past 6 months
        const lastSixMonths = []
        const monthData = []
        
        for (let i = 5; i >= 0; i--) {
          const d = new Date()
          d.setMonth(d.getMonth() - i)
          const monthName = d.toLocaleString('default', { month: 'short' })
          const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          
          lastSixMonths.push(monthName)
          
          // Count appointments for this month
          const count = allAppointments.filter(appointment => {
            const appointmentMonth = appointment.appointment_date.substring(0, 7)
            return appointmentMonth === yearMonth
          }).length
          
          monthData.push(count)
        }

        setMonthlyAppointments({
          labels: lastSixMonths,
          data: monthData
        })

        // Fetch recent activity (last 5 appointments)
        const { data: recentData, error: recentError } = await supabase
          .from('appointments')
          .select(`
            *,
            patients (
              full_name
            )
          `)
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentError) throw recentError
        setRecentActivity(recentData)

      } catch (error) {
        console.error('Error fetching data:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const statusColors = {
    pending: '#FFA500',
    confirmed: '#4CAF50',
    cancelled: '#F44336',
    completed: '#2196F3'
  }

  const appointmentChartData = {
    labels: ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    datasets: [
      {
        data: [
          appointmentStats.pending,
          appointmentStats.confirmed,
          appointmentStats.cancelled,
          appointmentStats.completed
        ],
        backgroundColor: Object.values(statusColors),
        borderWidth: 1
      }
    ]
  }

  // Age distribution chart data
  const ageDistributionData = {
    labels: ['Under 18', '18-25', '26-35', '36-45', 'Over 45'],
    datasets: [
      {
        label: 'Number of Patients',
        data: [
          patientAgeGroups.under18,
          patientAgeGroups['18-25'],
          patientAgeGroups['26-35'],
          patientAgeGroups['36-45'],
          patientAgeGroups.over45
        ],
        backgroundColor: [
          '#FFB6C1', // Light pink
          '#FF69B4', // Hot pink
          '#C71585', // Medium violet red
          '#DB7093', // Pale violet red
          '#FF1493', // Deep pink
        ],
        borderWidth: 1
      }
    ]
  }

  // Common conditions chart data
  const conditionsChartData = {
    labels: commonConditions.map(item => item.name),
    datasets: [
      {
        label: 'Number of Patients',
        data: commonConditions.map(item => item.count),
        backgroundColor: '#FF69B4',
        borderColor: '#C71585',
        borderWidth: 1
      }
    ]
  }

  // Monthly appointments chart data
  const monthlyAppointmentsData = {
    labels: monthlyAppointments.labels,
    datasets: [
      {
        label: 'Appointments',
        data: monthlyAppointments.data,
        borderColor: '#1976D2',
        backgroundColor: 'rgba(25, 118, 210, 0.2)',
        tension: 0.4,
        fill: true
      }
    ]
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <DoctorSidenav 
        onSignOut={signOut} 
        onSidebarToggle={handleSidebarToggle} 
        isCollapsed={isSidebarCollapsed} 
      />
      
      <div className={`main-content ${isSidebarCollapsed ? 'content-expanded' : ''}`}>
        <Header isSidebarCollapsed={isSidebarCollapsed} />
        <div className="dashboard-container">
          {error && <div className="error-message">{error}</div>}

          <div className="dashboard-header">
            <div className="dashboard-header-content">
              <div className="header-decoration"></div>
              <div className="header-decoration-2"></div>
              <div className="doctor-welcome">
                <h1>Welcome back, {doctorInfo?.full_name || user?.user_metadata?.full_name || 'Doctor'}</h1>
                {doctorInfo?.specialty && <p className="specialty">{doctorInfo.specialty}</p>}
              </div>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Patients</h3>
              <p className="stat-number">{stats.totalPatients}</p>
            </div>
            <div className="stat-card">
              <h3>Today's Appointments</h3>
              <p className="stat-number">{stats.todayAppointments}</p>
            </div>
            <div className="stat-card">
              <h3>Completion Rate</h3>
              <p className="stat-number">{completionRate}%</p>
            </div>
            <div className="stat-card">
              <h3>Avg. Duration</h3>
              <p className="stat-number">{averageDuration} min</p>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="grid-item today-appointments">
              <h2>Today's Appointments</h2>
              {todaysAppointments.length === 0 ? (
                <p className="no-data">No appointments scheduled for today</p>
              ) : (
                <div className="appointments-list">
                  {todaysAppointments.map(appointment => (
                    <div key={appointment.id} className="appointment-card">
                      <div className="appointment-time">
                        {new Date(`2000-01-01T${appointment.start_time}`).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="appointment-details">
                        <h4>{appointment.patients.full_name}</h4>
                        <p>{appointment.reason}</p>
                        <span className={`status-badge ${appointment.status}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="appointment-actions">
                        <button className="action-btn">View</button>
                        <button className="action-btn">Update</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid-item appointment-stats">
              <h2>Appointment Status Distribution</h2>
              <div className="chart-container">
                <Doughnut
                  data={appointmentChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid-item recent-activity">
              <h2>Recent Activity</h2>
              <div className="activity-list">
                {recentActivity.map(activity => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-calendar-check"></i>
                    </div>
                    <div className="activity-details">
                      <p>
                        Appointment with {activity.patients.full_name}
                        <span className={`status-badge ${activity.status}`}>
                          {activity.status}
                        </span>
                      </p>
                      <small>
                        {new Date(activity.created_at).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Statistical Components */}
            <div className="grid-item patient-age-distribution">
              <h2>Patient Age Distribution</h2>
              <div className="chart-container">
                <Bar
                  data={ageDistributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      title: {
                        display: true,
                        text: 'Patient Age Groups'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Patients'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid-item common-conditions">
              <h2>Common Gynecological Conditions</h2>
              {commonConditions.length === 0 ? (
                <p className="no-data">No condition data available</p>
              ) : (
                <div className="chart-container">
                  <Bar
                    data={conditionsChartData}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false
                        }
                      },
                      scales: {
                        x: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Number of Patients'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid-item monthly-trend">
              <h2>Monthly Appointment Trends</h2>
              <div className="chart-container">
                <Line
                  data={monthlyAppointmentsData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      },
                      title: {
                        display: true,
                        text: 'Appointments - Last 6 Months'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Number of Appointments'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}