import React from 'react'
import DoctorSidenav from './DoctorSidenav'

export default function DoctorProfile() {
  return (
    <div className="layout">
      <DoctorSidenav />
      <div className="content">
        <h1>Doctor Profile</h1>
        {/* Add your doctor profile content here */}
      </div>
    </div>
  )
}