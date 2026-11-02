// Indian vehicle registration number validation.
// Formats accepted:
//   Standard: KA01AB1234  (state, 1-2 digit RTO, 1-3 series letters, 4 digits)
//   BH series: 22BH1234AA (year, "BH", 4 digits, 1-2 letters)
const STATE_CODES = new Set([
  "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN", "GA", "GJ", "HP",
  "HR", "JH", "JK", "KA", "KL", "LA", "LD", "MH", "ML", "MN", "MP", "MZ", "NL",
  "OD", "OR", "PB", "PY", "RJ", "SK", "TN", "TG", "TR", "TS", "UK", "UP", "WB",
]);

const STANDARD = /^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{4})$/;
const BH_SERIES = /^(\d{2})BH(\d{4})([A-Z]{1,2})$/;

export const normalizeVehicle = (value) =>
  String(value ?? "").toUpperCase().replace(/[\s-]/g, "");

// Returns { valid, normalized, formatted, type?, message? }
export const checkVehicleNumber = (value) => {
  const normalized = normalizeVehicle(value);

  if (!normalized) {
    return { valid: false, normalized, message: "Vehicle number is required." };
  }

  const bh = normalized.match(BH_SERIES);
  if (bh) {
    return {
      valid: true,
      normalized,
      type: "BH series",
      formatted: `${bh[1]} BH ${bh[2]} ${bh[3]}`,
    };
  }

  const m = normalized.match(STANDARD);
  if (!m) {
    return {
      valid: false,
      normalized,
      message: "Invalid format. Use a number like KA01AB1234 (state, RTO, series, 4 digits).",
    };
  }

  const [, state, rto, series, number] = m;
  if (!STATE_CODES.has(state)) {
    return { valid: false, normalized, message: `"${state}" is not a valid state/UT code.` };
  }
  if (Number(rto) === 0) {
    return { valid: false, normalized, message: "RTO code cannot be 00." };
  }
  if (number === "0000") {
    return { valid: false, normalized, message: "Registration digits cannot be 0000." };
  }

  return {
    valid: true,
    normalized,
    type: "Standard",
    formatted: `${state} ${rto.padStart(2, "0")} ${series} ${number}`,
  };
};
