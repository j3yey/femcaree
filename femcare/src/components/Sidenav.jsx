import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FaBars, 
  FaCalendarAlt, 
  FaSignOutAlt, 
  FaHome, 
  FaFileAlt,
  FaUser,
  FaBabyCarriage,
  FaChartLine,
  FaEnvelope
} from 'react-icons/fa';
import '../styles/Sidenav.css';

export default function Sidenav({ onSignOut, onCollapsedChange }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setCollapsed(JSON.parse(savedState));
    }
  }, []);

  const toggleSidebar = () => {
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newCollapsed));
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsed);
    }
  };

  const menuItems = [
    {
      to: "/patient-dashboard",
      icon: <FaHome className="menu-icon" />,
      label: "Home"
    },
    {
      to: "/appointments-booking",
      icon: <FaCalendarAlt className="menu-icon" />,
      label: "Appointments"
    },
    {
      to: "/medical-records",
      icon: <FaFileAlt className="menu-icon" />,
      label: "Medical Records"
    },
    {
      to: "/profile",
      icon: <FaUser className="menu-icon" />,
      label: "Profile"
    },
      {
    to: "/patient-messages", // Add new route for messages
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