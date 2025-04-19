import React from 'react'
import DoctorSidenav from './DoctorSidenav'

export default function PatientRecords() {
  return (
    <div className="layout">
      <DoctorSidenav />
      <div className="content">
        <h1>Patient Records</h1>
        {/* Add your patient records content here */}
      </div>
    </div>
  )
}