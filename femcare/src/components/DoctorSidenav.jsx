import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBars, 
  FaCalendarAlt, 
  FaSignOutAlt, 
  FaHome, 
  FaFileAlt,
  FaUser,
  FaUserInjured
} from 'react-icons/fa';
import '../styles/Sidenav.css';

export default function DoctorSidenav({ onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedState = localStorage.getItem('doctorSidebarCollapsed');
    if (savedState !== null) {
      setCollapsed(JSON.parse(savedState));
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    localStorage.setItem('doctorSidebarCollapsed', JSON.stringify(!collapsed));
  };

  const menuItems = [
    {
      to: "/doctor-dashboard",
      icon: <FaHome className="menu-icon" />,
      label: "Dashboard"
    },
    {
      to: "/doctor-profile",
      icon: <FaUser className="menu-icon" />,
      label: "Profile"
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