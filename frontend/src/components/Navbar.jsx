import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="nav">
      <Link to="/" className="brand"><span className="brand-p">P</span>BayBook</Link>
      <nav>
        <NavLink to="/" end>Find parking</NavLink>
        {user && <NavLink to="/bookings">My bookings</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Manage</NavLink>}
      </nav>
      <div className="nav-right">
        {user ? (
          <>
            <span className="who"><span className="avatar">{user.name?.[0]?.toUpperCase()}</span>{user.name}</span>
            <button className="btn ghost" onClick={() => { logout(); navigate('/'); }}>Log out</button>
          </>
        ) : (
          <>
            <Link className="btn ghost" to="/login">Log in</Link>
            <Link className="btn" to="/register">Sign up</Link>
          </>
        )}
      </div>
    </header>
  );
}
