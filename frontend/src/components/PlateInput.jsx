import { useEffect, useState } from 'react';
import api from '../api';

// Number-plate styled input. The backend decides whether the number is valid.
export default function PlateInput({ value, onChange, onValidity }) {
  const [state, setState] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    if (!value.trim()) { setState({ status: 'idle', message: '' }); onValidity?.(false); return; }
    setState((s) => ({ ...s, status: 'checking' }));
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/vehicles/validate', { params: { number: value } });
        setState(data.valid
          ? { status: 'ok', message: `${data.formatted} · ${data.type} plate` }
          : { status: 'bad', message: data.message });
        onValidity?.(data.valid);
      } catch {
        setState({ status: 'idle', message: 'Could not reach the server to verify this number.' });
        onValidity?.(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="plate-wrap">
      <div className={`plate ${state.status}`}>
        <span className="plate-strip">IND</span>
        <input
          value={value}
          maxLength={14}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9 -]/g, ''))}
          placeholder="KA01AB1234"
          autoComplete="off"
          spellCheck="false"
          aria-label="Vehicle number"
          aria-invalid={state.status === 'bad'}
        />
        <span className="plate-icon" aria-hidden>
          {state.status === 'ok' ? '✓' : state.status === 'bad' ? '✕' : state.status === 'checking' ? '…' : ''}
        </span>
      </div>
      <p className={`plate-msg ${state.status}`} role="status">{state.message || 'Enter your registration number, e.g. KA01AB1234'}</p>
    </div>
  );
}
