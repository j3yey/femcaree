import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Homepage.css';

export default function HomePage() {
  const { user, isPatient, isDoctor } = useAuth();

  return (
    <div className="home-container">
      <h1>FemCare Medical Portal</h1>

      {/* FemCare Description */}
      <div className="description-container">
        <p>
          FemCare is dedicated to providing high-quality healthcare solutions for women, 
          ensuring accessible, efficient, and patient-centered medical services.
        </p>
      </div>

      {/* Mission & Vision Section */}
      <div className="mission-vision-container">
        <div className="mission">
          <h2>Our Mission</h2>
          <p>
            To empower women's health by offering comprehensive and accessible medical services, 
            fostering a compassionate and innovative healthcare environment.
          </p>
        </div>
        <div className="vision">
          <h2>Our Vision</h2>
          <p>
            To be the leading healthcare platform dedicated to women's wellness, 
            integrating technology and professional care for a healthier future.
          </p>
        </div>
      </div>

      {/* Authentication Options */}
      {user ? (
        <div className="welcome-container">
          <h2>Welcome Back!</h2>
          {isPatient && (
            <Link to="/patient-dashboard" className="auth-button">
              Go to Patient Dashboard
            </Link>
          )}
          {isDoctor && (
            <Link to="/doctor-dashboard" className="auth-button">
              Go to Doctor Dashboard
            </Link>
          )}
        </div>
      ) : (
        <div className="auth-options">
          <div className="auth-option">
            <h2>For Patients</h2>
            <p>Access your medical records, appointments, and more.</p>
            <div className="auth-buttons">
              <Link to="/patient-login" className="auth-button">
                Patient Login
              </Link>
              <Link to="/patient-register" className="auth-button secondary">
                Register as Patient
              </Link>
            </div>
          </div>

          <div className="auth-option">
            <h2>For Doctors</h2>
            <p>Access patient information, schedules, and medical records.</p>
            <Link to="/doctor-login" className="auth-button">
              Doctor Login
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
