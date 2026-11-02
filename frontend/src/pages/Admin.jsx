import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';

const empty = { name: '', address: '', pricePerHour: '', perRow: 6, rows: 'A,B' };
const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

export default function Admin() {
  const [lots, setLots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [l, b] = await Promise.all([api.get('/lots'), api.get('/bookings')]);
      setLots(l.data);
      setBookings(b.data);
    } catch (e) { setError(errMsg(e)); }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { name: form.name, address: form.address, pricePerHour: Number(form.pricePerHour) };
      if (editId) await api.put(`/lots/${editId}`, body);
      else await api.post('/lots', { ...body, perRow: Number(form.perRow), rows: form.rows.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean) });
      setForm(empty);
      setEditId(null);
      load();
    } catch (err) { setError(errMsg(err)); }
  };

  const edit = (l) => { setEditId(l._id); setForm({ ...empty, name: l.name, address: l.address, pricePerHour: l.pricePerHour }); };
  const remove = async (l) => {
    if (!window.confirm(`Delete ${l.name} and all its bays?`)) return;
    try { await api.delete(`/lots/${l._id}`); load(); } catch (err) { setError(errMsg(err)); }
  };

  return (
    <>
      <h1>Manage parking</h1>
      {error && <p className="alert" role="alert">{error}</p>}

      <form className="panel" onSubmit={submit}>
        <h2>{editId ? 'Edit lot' : 'Add a lot'}</h2>
        <div className="grid2">
          <label>Name<input value={form.name} onChange={set('name')} required /></label>
          <label>Address<input value={form.address} onChange={set('address')} required /></label>
          <label>Price per hour (₹)<input type="number" min="0" value={form.pricePerHour} onChange={set('pricePerHour')} required /></label>
          {!editId && <label>Rows (comma separated)<input value={form.rows} onChange={set('rows')} /></label>}
          {!editId && <label>Bays per row<input type="number" min="1" max="30" value={form.perRow} onChange={set('perRow')} /></label>}
        </div>
        <div className="row-actions">
          <button className="btn">{editId ? 'Save changes' : 'Add lot'}</button>
          {editId && <button type="button" className="btn ghost" onClick={() => { setEditId(null); setForm(empty); }}>Cancel edit</button>}
        </div>
      </form>

      <h2>Lots</h2>
      <div className="lot-list">
        {lots.map((l) => (
          <div className="lot-row" key={l._id}>
            <div><h2>{l.name}</h2><p className="muted">{l.address} · ₹{l.pricePerHour}/hr · {l.totalSlots} bays</p></div>
            <div className="row-actions">
              <button className="btn ghost" onClick={() => edit(l)}>Edit</button>
              <button className="btn danger" onClick={() => remove(l)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <h2>Recent bookings</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Lot</th><th>Bay</th><th>From</th><th>To</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b._id}>
                <td>{b.user?.name}</td><td>{b.lot?.name}</td><td>{b.slot?.label}</td>
                <td>{fmt(b.startTime)}</td><td>{fmt(b.endTime)}</td><td>₹{b.amount}</td><td>{b.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
