// Shared Razorpay Checkout helper used by new bookings and booking extensions.
let sdk;
export const loadRazorpay = () => {
  if (typeof window.Razorpay === 'function') return Promise.resolve();
  sdk ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => (typeof window.Razorpay === 'function' ? resolve() : reject(new Error('Razorpay failed to initialise. Refresh and retry.')));
    s.onerror = () => { sdk = null; s.remove(); reject(new Error('Could not load Razorpay. Check your internet connection or ad-blocker.')); };
    document.body.appendChild(s);
  });
  return sdk;
};

// Show every payment method up-front (UPI, cards, wallets, netbanking).
const methodBlocks = {
  display: {
    blocks: {
      upi: { name: 'Pay using UPI', instruments: [{ method: 'upi' }] },
      card: { name: 'Credit / Debit card', instruments: [{ method: 'card' }] },
      wallet: { name: 'Wallets', instruments: [{ method: 'wallet' }] },
      netbanking: { name: 'Netbanking', instruments: [{ method: 'netbanking' }] },
    },
    sequence: ['block.upi', 'block.card', 'block.wallet', 'block.netbanking'],
    preferences: { show_default_blocks: true },
  },
};

export async function openCheckout({ order, description, user, onSuccess, onDismiss, onFailed }) {
  await loadRazorpay();
  if (!order?.keyId || !order?.orderId || !order?.amount) {
    throw new Error('Invalid payment order received. Check the Razorpay keys in backend/.env.');
  }
  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency || 'INR',
    name: 'BayBook Parking',
    description,
    order_id: order.orderId,
    prefill: { name: user?.name || '', email: user?.email || '' },
    theme: { color: '#7c3aed' },
    config: methodBlocks,
    handler: onSuccess,
    modal: { ondismiss: onDismiss, confirm_close: true, escape: false },
  });
  rzp.on('payment.failed', (r) => onFailed?.(r.error?.description || 'Payment failed. Please try again.'));
  rzp.open();
}
