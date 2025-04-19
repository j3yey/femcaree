import React, { useState, useEffect } from 'react';
import DoctorSidenav from './DoctorSidenav';

export default function PatientsData() {
  return (
    <div className="layout">
      <DoctorSidenav />
      <div className="content">
        <h1>Patients Data</h1>
        {/* Add your doctor profile content here */}
      </div>
    </div>
  )
}