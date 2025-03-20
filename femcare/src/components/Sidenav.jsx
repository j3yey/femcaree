import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaUserMd, FaSignOutAlt, FaHome, FaClipboardList } from 'react-icons/fa';
import '../styles/Sidenav.css';

export default function Sidenav({ onSignOut }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setCollapsed(JSON.parse(savedState));
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(!collapsed));
  };

  return (
    <nav className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">{collapsed ? '' : 'Dashboard'}</span>
        <FaBars onClick={toggleSidebar} className="sidebar-toggle" />
      </div>

      <ul className="sidebar-menu">
        <div className="menu-item">
          <li>
            <Link to="/appointments">
              <FaHome /> <span className={collapsed ? 'hidden' : ''}>Appointments</span>
            </Link>
          </li>
        </div>

        <div className="menu-item">
          <li>
            <Link to="/patient-dashboard">
              <FaUserMd /> <span className={collapsed ? 'hidden' : ''}>Patient Dashboard</span>
            </Link>
          </li>
        </div>

        <div className="menu-item">
          <li>
            <Link to="/doctor-dashboard">
              <FaClipboardList /> <span className={collapsed ? 'hidden' : ''}>Doctor Dashboard</span>
            </Link>
          </li>
        </div>

        <div className="menu-item">
          <li>
            <Link to="/medical-records">
              <FaClipboardList /> <span className={collapsed ? 'hidden' : ''}>Medical Records</span>
            </Link>
          </li>
        </div>

        <div className="menu-item">
          <li>
            <Link to="/patients">
              <FaUserMd /> <span className={collapsed ? 'hidden' : ''}>Patients</span>
            </Link>
          </li>
        </div>
      </ul>

      <div className="menu-item logout-container">
        <button
          onClick={() => {
            onSignOut();
            navigate("/");
          }}
          className="logout-button"
        >
          <FaSignOutAlt /> <span className={collapsed ? 'hidden' : ''}>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
