// Notifications that appear outside the app (on the laptop or phone screen), like Messenger or WhatsApp.
// They use the browser's own notification feature. The setting is saved per person on THIS device only,
// because the permission is also per device.
//
// Limits to know about:
//   - They need HTTPS, or localhost on the same computer. A plain http://192.168.x.x address is refused by the browser.
//   - They arrive while the app is open in a tab (even a hidden one) or installed on the phone's home screen.
//     Hidden tabs are slowed down by the browser, so a message can take up to about a minute to show.
//   - When every tab is closed nothing can arrive. That needs a push server, which is not connected yet.

const KEY = (id) => `notify-settings:${id}`;
export const DEFAULT_NOTIFY = { outside: false, preview: true };

export function loadNotifySettings(userId) {
  try { return { ...DEFAULT_NOTIFY, ...JSON.parse(localStorage.getItem(KEY(userId)) || '{}') }; } catch { return { ...DEFAULT_NOTIFY }; }
}

export function saveNotifySettings(userId, settings) {
  try { localStorage.setItem(KEY(userId), JSON.stringify(settings)); } catch { /* ignore */ }
}

export const outsideSupported = () => typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;
export const outsidePermission = () => (outsideSupported() ? Notification.permission : 'unsupported');

let reg = null;
async function registration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    reg = reg || (await navigator.serviceWorker.register('/sw.js'));
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

// Asks the browser for permission. Returns 'granted', 'denied', 'default' or 'unsupported'.
export async function enableOutside() {
  if (!outsideSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') await registration();
  return result;
}

// Shows one notification. title = who it is from. tag groups notifications from the same sender into one.
export async function showOutside({ title, body, tag, data }) {
  if (outsidePermission() !== 'granted') return false;
  const options = { body, tag, renotify: !!tag, data, icon: '/logo-app.png', badge: '/logo-app.png' };
  try {
    const r = await registration();
    if (r) { await r.showNotification(title, options); return true; }
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch {
    return false;
  }
}