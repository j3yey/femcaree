import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import PatientRegistration from './components/PatientRegistration'
import PatientLogin from './components/PatientLogin'
import DoctorLogin from './components/DoctorLogin'
import PatientDashboard from './components/PatientDashboard'
import DoctorDashboard from './components/DoctorDashboard'
import Unauthorized from './components/Unauthorized'
import HomePage from './components/Homepage'
import DoctorProfile from './components/DoctorProfile'
import PatientAppointments from './components/PatientAppointments'
import PatientRecords from './components/PatientRecords'
import PatientsData from './components/PatientsData'
import Profile from './components/Profile'
import MedicalRecords from './components/MedicalRecords'
import AppointmentsBooking from './components/AppointmentsBooking'
import DoctorMessages from './components/DoctorMessages'
import PatientMessages from './components/PatientMessages'
import './App.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Routes>
            {/* Public Routes */}
           
            <Route path="/" element={<HomePage />} />
            <Route path="/patient-register" element={<PatientRegistration />} />
            <Route path="/patient-login" element={<PatientLogin />} />
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Patient Protected Routes */}
            <Route 
              path="/patient-dashboard" 
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute requiredRole="patient">
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/appointments-booking" 
              element={
                <ProtectedRoute requiredRole="patient">
                  <AppointmentsBooking />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/medical-records" 
              element={
                <ProtectedRoute requiredRole="patient">
                  <MedicalRecords />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/patient-messages" 
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientMessages />
                </ProtectedRoute>
              } 
            />
            {/* Doctor Protected Routes */}
            <Route 
              path="/doctor-dashboard" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/doctor-profile" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorProfile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/patient-appointments" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <PatientAppointments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/patient-records" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <PatientRecords />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/patients-data" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <PatientsData />
                </ProtectedRoute>
              } 
            />
             <Route 
              path="/doctor-messages" 
              element={
                <ProtectedRoute requiredRole="doctor">
                  <DoctorMessages />
                </ProtectedRoute>
              } 
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  )
}

export default App