// Draws the lot as painted parking bays. Free bays can be selected, booked bays show a parked car.
const TYPE_LABEL = { car: 'Car', bike: 'Bike', ev: '⚡ EV', disabled: '♿ Access' };

const Car = () => (
  <svg viewBox="0 0 40 70" className="car-ico" aria-hidden>
    <rect x="3" y="2" width="34" height="66" rx="11" fill="currentColor" />
    <rect x="8" y="17" width="24" height="14" rx="5" fill="#0b1230" opacity=".75" />
    <rect x="8" y="46" width="24" height="10" rx="4" fill="#0b1230" opacity=".6" />
  </svg>
);

export default function SlotGrid({ slots, selectedId, onSelect }) {
  const rows = slots.reduce((acc, s) => {
    const key = s.label[0];
    (acc[key] = acc[key] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="lot-floor" role="group" aria-label="Parking bays">
      {Object.entries(rows).map(([row, list]) => (
        <div className="bay-row" key={row}>
          {list.map((s) => (
            <button
              key={s._id}
              type="button"
              disabled={s.booked}
              aria-pressed={selectedId === s._id}
              aria-label={`Slot ${s.label}${s.booked ? ', booked' : ''}`}
              className={`bay ${s.type} ${s.booked ? 'taken' : ''} ${selectedId === s._id ? 'chosen' : ''}`}
              onClick={() => onSelect(s)}
            >
              {(s.booked || selectedId === s._id) && <Car />}
              <span className="bay-label">{s.label}</span>
              <span className="bay-type">{s.booked ? 'Booked' : selectedId === s._id ? 'Your spot' : TYPE_LABEL[s.type]}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
