import { useAuth } from '../contexts/AuthContext'
import Sidenav from './Sidenav.jsx';

export default function Appointments() {
    const { user, signOut } = useAuth()

    return (
        <div className="dashboard-container">
        {/* Sidebar */}
        <Sidenav onSignOut={signOut} />
        </div>
        )
}