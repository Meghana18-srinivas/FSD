import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api';

const ACCENTS = ['#ff4d8d', '#22d3ee', '#a3e635', '#fbbf24', '#8b5cf6'];

// 3D tilt that follows the pointer.
const tilt = (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
  e.currentTarget.style.setProperty('--rx', `${-((e.clientY - r.top) / r.height - 0.5) * 8}deg`);
};
const untilt = (e) => { e.currentTarget.style.setProperty('--rx', '0deg'); e.currentTarget.style.setProperty('--ry', '0deg'); };

export default function Lots() {
  const [lots, setLots] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/lots').then((r) => setLots(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }, []);

  const shown = lots.filter((l) => (l.name + l.address).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Smart parking · Bengaluru</p>
        <h1>Reserve your bay <span className="grad">before you arrive.</span></h1>
        <p className="hero-sub">Pick a lot, choose a time, tap a free bay and pay with UPI, card or wallet.</p>
        <input className="search" placeholder="🔍 Search by lot name or area" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search parking lots" />
        <div className="road" aria-hidden><span className="drive">🚗</span><span className="drive d2">🚙</span></div>
      </section>

      {error && <p className="alert">{error}</p>}
      {loading && <p className="muted">Loading parking lots…</p>}
      {!loading && !error && shown.length === 0 && <p className="muted">No lots match “{q}”. Try a different area.</p>}

      <div className="lot-grid">
        {shown.map((l, i) => {
          const pct = l.totalSlots ? Math.round((l.availableNow / l.totalSlots) * 100) : 0;
          return (
            <Link
              to={`/lots/${l._id}`}
              className="lot-card glass"
              key={l._id}
              style={{ '--accent': ACCENTS[i % ACCENTS.length] }}
              onMouseMove={tilt}
              onMouseLeave={untilt}
            >
              <span className="lot-badge">P</span>
              <h2>{l.name}</h2>
              <p className="muted">📍 {l.address}</p>
              <div className="meter" aria-hidden><i style={{ width: `${pct}%` }} /></div>
              <div className="lot-foot">
                <span className={`avail ${l.availableNow === 0 ? 'none' : ''}`}>{l.availableNow} of {l.totalSlots} free now</span>
                <span className="price">₹{l.pricePerHour}<small>/hr</small></span>
              </div>
              <span className="go">Book a bay →</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
