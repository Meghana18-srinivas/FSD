// Separate date + time pickers. value / onChange use "YYYY-MM-DDTHH:mm" (local time).
export default function DateTimeField({ label, value, onChange, min }) {
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  const minDate = min?.slice(0, 10);

  return (
    <div className="dt-field">
      <span className="dt-label">{label}</span>
      <div className="dt">
        <input
          type="date"
          value={date}
          min={minDate}
          aria-label={`${label} date`}
          onChange={(e) => e.target.value && onChange(`${e.target.value}T${time || '00:00'}`)}
        />
        <input
          type="time"
          value={time}
          step="900"
          aria-label={`${label} time`}
          onChange={(e) => e.target.value && onChange(`${date}T${e.target.value}`)}
        />
      </div>
    </div>
  );
}
