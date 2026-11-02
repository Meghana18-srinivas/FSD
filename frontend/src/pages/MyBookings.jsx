import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { openCheckout } from '../razorpay';
import DateTimeField from '../components/DateTimeField';
import { useAuth } from '../context/AuthContext';

const fmt = (d) => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const toInput = (d) => new Date(new Date(d).getTime() - new Date(d).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function MyBookings() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { id, end }
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState('');

  const load = () => api.get('/bookings/mine').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking? Paid bookings are refunded in full if cancelled before the start time; no refund once parking has started.')) return;
    try {
      const r = await api.delete(`/bookings/${id}`);
      setError('');
      setInfo(r.data.message);
      load();
    } catch (e) { setInfo(''); setError(errMsg(e)); }
  };

  const saveEnd = async () => {
    const bookingId = editing.id;
    try {
      const r = await api.put(`/bookings/${bookingId}`, { endTime: new Date(editing.end).toISOString() });
      setError('');

      if (r.data.requiresPayment) {
        // Longer stay: pay the extra amount first; the booking changes only after verification.
        const o = r.data;
        await openCheckout({
          order: o,
          user,
          description: `Extend booking · extra ₹${o.extraAmount}`,
          onSuccess: async (response) => {
            try {
              const v = await api.post(`/payments/extend/${bookingId}/verify`, response);
              setInfo(v.data.message);
              setEditing(null);
            } catch (e) { setInfo(''); setError(errMsg(e)); }
            load();
          },
          onFailed: (msg) => setError(msg),
        });
        return;
      }

      setInfo(r.data.message || 'Booking updated');
      setEditing(null);
      load();
    } catch (e) { setInfo(''); setError(errMsg(e)); }
  };

  return (
    <>
      <h1>My bookings</h1>
      {error && <p className="alert">{error}</p>}
      {info && <p className="muted" role="status">{info}</p>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && items.length === 0 && <p className="muted">You have no bookings yet. Find a lot and reserve your first bay.</p>}

      <div className="lot-list">
        {items.map((b) => {
          const active = b.status === 'confirmed' && new Date(b.endTime) > new Date();
          return (
            <div className="lot-row stack glass" key={b._id}>
              <div className="row-top">
                <div>
                  <h2>{b.lot?.name} · Bay {b.slot?.label}</h2>
                  <p className="muted">{fmt(b.startTime)} → {fmt(b.endTime)} · <span className="mini-plate">{b.vehicleNumber}</span></p>
                </div>
                <div className="lot-meta">
                  <span className="price">₹{b.amount}</span>
                  <span className={`tag ${b.status}`}>{b.status === 'confirmed' && !active ? 'completed' : b.status.replace('_', ' ')}</span>
                  <span className="muted">Payment: {(b.payment || 'pending').replace('_', ' ')}{b.refundedAmount > 0 ? ` · ₹${b.refundedAmount} refunded` : ''}</span>
                </div>
              </div>
              {active && (
                editing?.id === b._id ? (
                  <div className="row-actions">
                    <DateTimeField label="New end" value={editing.end} min={toInput(new Date())} onChange={(v) => setEditing({ ...editing, end: v })} />
                    <button className="btn" onClick={saveEnd}>Save new end time</button>
                    <button className="btn ghost" onClick={() => setEditing(null)}>Keep as is</button>
                  </div>
                ) : (
                  <div className="row-actions">
                    <button className="btn ghost" onClick={() => setEditing({ id: b._id, end: toInput(b.endTime) })}>Change end time</button>
                    <button className="btn danger" onClick={() => cancel(b._id)}>Cancel booking</button>
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
