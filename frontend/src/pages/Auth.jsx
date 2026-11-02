import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api';
import PlateInput from '../components/PlateInput';

export default function Auth({ mode }) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', vehicleNumber: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [plateOk, setPlateOk] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isLogin && form.vehicleNumber.trim() && !plateOk) return setError('Enter a valid vehicle number, or leave it empty.');
    if (!isLogin && form.password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form);
      navigate('/');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel narrow glass" onSubmit={submit}>
      <h1>{isLogin ? 'Log in' : 'Create your account'}</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      {!isLogin && (
        <label>Full name<input value={form.name} onChange={set('name')} required /></label>
      )}
      <label>Email<input type="email" value={form.email} onChange={set('email')} required /></label>
      <label>Password<input type="password" value={form.password} onChange={set('password')} required /></label>
      {!isLogin && (
        <>
          <label>Vehicle number (optional)</label>
          <PlateInput value={form.vehicleNumber} onChange={(v) => setForm({ ...form, vehicleNumber: v })} onValidity={setPlateOk} />
        </>
      )}
      <button className="btn wide" disabled={busy}>{busy ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}</button>
      <p className="muted">
        {isLogin ? <>New here? <Link to="/register">Create an account</Link></> : <>Already registered? <Link to="/login">Log in</Link></>}
      </p>
      {isLogin && <p className="muted small">Demo: user@parking.com / user123 · admin@parking.com / admin123</p>}
    </form>
  );
}
