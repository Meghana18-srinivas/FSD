import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../context/AuthContext';
import { openCheckout } from '../razorpay';
import SlotGrid from '../components/SlotGrid';
import PlateInput from '../components/PlateInput';
import DateTimeField from '../components/DateTimeField';

const toInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function LotDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [lot, setLot] = useState(null);
  const [start, setStart] = useState(() => toInput(new Date(Date.now() + 15 * 60000)));
  const [end, setEnd] = useState(() => toInput(new Date(Date.now() + 75 * 60000)));
  const [slot, setSlot] = useState(null);
  const [vehicle, setVehicle] = useState(user?.vehicleNumber || '');
  const [plateOk, setPlateOk] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/lots/${id}`, {
        params: { start: new Date(start).toISOString(), end: new Date(end).toISOString() },
      });
      setLot(response.data);
      setError('');
      setSlot((cur) => (cur && response.data.slots.find((s) => s._id === cur._id && !s.booked) ? cur : null));
    } catch (err) {
      setError(errMsg(err));
    }
  }, [id, start, end]);

  useEffect(() => { load(); }, [load]);

  const hours = Math.max(Math.ceil((new Date(end) - new Date(start)) / 3600000), 0);
  const total = lot ? hours * lot.pricePerHour : 0;

  // Changing arrival keeps the same stay length by moving the leave time too.
  const changeStart = (value) => {
    const gap = new Date(end) - new Date(start);
    setStart(value);
    if (gap > 0) setEnd(toInput(new Date(new Date(value).getTime() + gap)));
  };
  const nowInput = toInput(new Date());

  const setDuration = (h) => setEnd(toInput(new Date(new Date(start).getTime() + h * 3600000)));
  const duration = Math.round((new Date(end) - new Date(start)) / 3600000);

  const book = async () => {
    if (busy) return;
    if (!user) return navigate('/login');
    if (!slot) return setError('Choose a parking bay first.');
    if (!plateOk) return setError('Enter a valid vehicle number (e.g. KA01AB1234).');
    if (!(new Date(end) > new Date(start)) || hours < 1) {
      return setError('Leave time must be after arrival time, with at least one billable hour.');
    }

    setBusy(true);
    setError('');
    let bookingId = null;
    let paymentStarted = false;
    const release = () => (bookingId && !paymentStarted
      ? api.delete(`/bookings/${bookingId}`).catch(() => {})
      : Promise.resolve());

    try {
      // 1) hold the bay  2) create a Razorpay order  3) open checkout
      const booking = (await api.post('/bookings', {
        slotId: slot._id,
        vehicleNumber: vehicle,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      })).data;
      bookingId = booking._id;

      const order = (await api.post(`/payments/order/${bookingId}`)).data;

      await openCheckout({
        order,
        user,
        description: `Parking · ${lot.name} · Bay ${slot.label}`,
        onSuccess: async (response) => {
          paymentStarted = true;
          try {
            await api.post(`/payments/verify/${bookingId}`, response);
            navigate('/bookings');
          } catch (err) {
            setError(`Payment verification failed: ${errMsg(err)} Check My Bookings before paying again.`);
          } finally { setBusy(false); }
        },
        onDismiss: () => { setBusy(false); release().finally(load); },
        onFailed: (msg) => setError(msg),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to start payment. Please try again.');
      await release();
      setBusy(false);
      load();
    }
  };

  if (!lot) {
    return error ? <p className="alert" role="alert">{error}</p> : <p className="muted">Loading...</p>;
  }

  const free = lot.slots.filter((s) => !s.booked).length;

  return (
    <>
      <div className="lot-head glass">
        <div>
          <h1>{lot.name}</h1>
          <p className="muted">📍 {lot.address}</p>
        </div>
        <div className="lot-meta">
          <span className="price">₹{lot.pricePerHour}<small>/hr</small></span>
          <span className="avail">{free} of {lot.slots.length} bays free</span>
        </div>
      </div>

      <div className="when glass">
        <DateTimeField label="Arrive" value={start} onChange={changeStart} min={nowInput} />
        <DateTimeField label="Leave" value={end} onChange={setEnd} min={start} />
        <div className="chips" role="group" aria-label="Quick duration">
          {[1, 2, 3, 4, 8].map((h) => (
            <button key={h} type="button" className={`chip ${duration === h ? 'on' : ''}`} onClick={() => setDuration(h)}>{h} hr</button>
          ))}
        </div>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <SlotGrid slots={lot.slots} selectedId={slot?._id} onSelect={setSlot} />
      <div className="legend"><span className="sw free" /> Free <span className="sw sel" /> Your pick <span className="sw busy" /> Booked</div>

      <div className="panel checkout glass">
        {slot ? (
          <>
            <div className="bill">
              <div><span className="muted">Bay</span><strong>{slot.label}</strong></div>
              <div><span className="muted">Duration</span><strong>{hours} hr × ₹{lot.pricePerHour}</strong></div>
              <div className="bill-total"><span className="muted">Total</span><strong>₹{total}</strong></div>
            </div>
            <PlateInput value={vehicle} onChange={(v) => { setVehicle(v); setError(''); }} onValidity={setPlateOk} />
            <button className="btn pay" onClick={book} disabled={busy || hours < 1}>
              {busy ? 'Opening Razorpay…' : user ? `Pay ₹${total} securely` : 'Log in to book'}
            </button>
            <div className="methods" aria-label="Accepted payment methods">
              <span>UPI</span><span>Cards</span><span>Wallets</span><span>Netbanking</span>
              <em>🔒 Secured by Razorpay</em>
            </div>
          </>
        ) : (
          <p className="muted pick-hint">👆 Tap a free bay to continue.</p>
        )}
      </div>
    </>
  );
}
