import React from 'react'
import DoctorSidenav from './DoctorSidenav'

export default function PatientAppointments() {
  return (
    <div className="layout">
      <DoctorSidenav />
      <div className="content">
        <h1>Patient Appointments</h1>
        {/* Add your appointments content here */}
      </div>
    </div>
  )
}