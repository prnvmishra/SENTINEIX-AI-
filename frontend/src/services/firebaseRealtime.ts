import { limitToLast, onValue, query, ref, set } from "firebase/database";
import type { AppNotification } from "@shared/types";
import { database } from "@/services/firebaseClient";

const NOTIFICATIONS_PATH = "liveActivity/notifications";

/**
 * Persists a notification to Firebase Realtime Database so every signed-in
 * client (any tab, any device) sees it live — independent of the Socket.IO
 * connection that originally delivered it. This is what makes notifications
 * survive a backend restart and sync across multiple open dashboards.
 */
export function pushNotificationToRealtimeDb(notification: AppNotification): void {
  if (!database) return;

  void set(ref(database, `${NOTIFICATIONS_PATH}/${notification.id}`), notification).catch(() => {
    // Realtime sync is best-effort; the socket-delivered copy already updated this client.
  });
}

export function subscribeToRealtimeNotifications(callback: (notifications: AppNotification[]) => void): () => void {
  if (!database) {
    callback([]);
    return () => {};
  }

  const notificationsQuery = query(ref(database, NOTIFICATIONS_PATH), limitToLast(50));

  return onValue(
    notificationsQuery,
    (snapshot) => {
      const value = snapshot.val() as Record<string, AppNotification> | null;
      callback(value ? Object.values(value) : []);
    },
    () => callback([]),
  );
}
