import { useAuth } from '../contexts/AuthContext'
import Sidenav from './Sidenav.jsx';

export default function Patients() {
    const { user, signOut } = useAuth()

    return (
        <div className="dashboard-container">
        {/* Sidebar */}
        <Sidenav onSignOut={signOut} />
        </div>
        )
}