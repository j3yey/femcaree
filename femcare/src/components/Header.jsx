import React from 'react'
import '../styles/Header.css'
import { FaCalendar } from 'react-icons/fa'

export default function Header({ isSidebarCollapsed }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return (
    <div className={`app-header ${isSidebarCollapsed ? 'header-collapsed' : ''}`}>
      <div className="header-left">
        <h1>FemCare</h1>
      </div>
      <div className="header-right">
        <div className="date-info">
          <FaCalendar className="calendar-icon" />
          <span className="current-date">
            {currentDate}
          </span>
        </div>
      </div>
    </div>
  )
}