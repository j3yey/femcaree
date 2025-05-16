import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBars, 
  FaCalendarAlt, 
  FaSignOutAlt, 
  FaHome, 
  FaFileAlt,
  FaUserInjured,
  FaEnvelope // Add this new import
} from 'react-icons/fa';
import DoctorProfile from './DoctorProfile';
import '../styles/Sidenav.css';

export default function DoctorSidenav({ onSignOut, onSidebarToggle, isCollapsed }) {
  const [collapsed, setCollapsed] = useState(isCollapsed || false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If isCollapsed prop changes, update local state
    if (isCollapsed !== undefined && isCollapsed !== collapsed) {
      setCollapsed(isCollapsed);
    }
  }, [isCollapsed]);

  useEffect(() => {
    // On initial load, check localStorage
    const savedState = localStorage.getItem('doctorSidebarCollapsed');
    if (savedState !== null) {
      const isCollapsed = JSON.parse(savedState);
      setCollapsed(isCollapsed);
      // Notify parent component about initial state
      onSidebarToggle?.(isCollapsed);
      
      // Apply a class to the document body to manage responsive layout
      document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }
  }, [onSidebarToggle]);

  const toggleSidebar = () => {
    const newCollapsedState = !collapsed;
    setCollapsed(newCollapsedState);
    localStorage.setItem('doctorSidebarCollapsed', JSON.stringify(newCollapsedState));
    
    // Apply a class to the document body to manage responsive layout
    document.body.classList.toggle('sidebar-collapsed', newCollapsedState);
    
    // Notify parent component about state change
    onSidebarToggle?.(newCollapsedState);
  };

  const menuItems = [
    {
      to: "/doctor-dashboard",
      icon: <FaHome className="menu-icon" />,
      label: "Dashboard"
    },
    {
      to: "/patient-appointments",
      icon: <FaCalendarAlt className="menu-icon" />,
      label: "Patient Appointments"
    },
    {
      to: "/patient-records",
      icon: <FaFileAlt className="menu-icon" />,
      label: "Patient Records"
    },
    {
      to: "/patients-data",
      icon: <FaUserInjured className="menu-icon" />,
      label: "Patients"
    },
    {
      to: "/doctor-messages",
      icon: <FaEnvelope className="menu-icon" />,
      label: "Messages"
    }
  ];

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          {!collapsed && <h1 className="logo-text">FemCare</h1>}
        </div>
        <button 
          className="toggle-button"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <FaBars />
        </button>
      </div>

      {/* Only show DoctorProfile when sidebar is expanded */}
      {!collapsed && <DoctorProfile />}

      <ul className="sidebar-menu">
        {menuItems.map((item, index) => (
          <li key={index} className="menu-item">
            <Link 
              to={item.to} 
              className={`menu-link ${location.pathname === item.to ? 'active' : ''}`}
            >
              {item.icon}
              <span className={collapsed ? 'hidden' : ''}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="menu-item logout-container">
        <button
          onClick={() => {
            onSignOut();
            navigate("/");
          }}
          className="logout-button"
        >
          <FaSignOutAlt className="menu-icon" /> 
          <span className={collapsed ? 'hidden' : ''}>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}