// src/components/Unauthorized.jsx
export default function Unauthorized() {
    return (
      <div className="error-container">
        <h1>Unauthorized Access</h1>
        <p>You do not have permission to access this page.</p>
        <a href="/" className="button">Back to Home</a>
      </div>
    )
  }