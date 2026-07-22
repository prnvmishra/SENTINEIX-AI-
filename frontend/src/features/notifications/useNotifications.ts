import { useEffect, useMemo, useRef, useState } from "react";
import type { AppNotification } from "@shared/types";
import { notificationApi } from "@/services/notificationApi";
import { pushNotificationToRealtimeDb, subscribeToRealtimeNotifications } from "@/services/firebaseRealtime";
import { useAuth } from "@/hooks/useAuth";
import { useLiveCase } from "@/hooks/useLiveCase";

export function useNotifications() {
  const { token } = useAuth();
  const { liveNotifications } = useLiveCase();
  const [history, setHistory] = useState<AppNotification[]>([]);
  const [realtimeNotifications, setRealtimeNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const syncedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    let isMounted = true;

    notificationApi
      .list(token)
      .then((response) => {
        if (isMounted) setHistory(response.notifications);
      })
      .catch(() => {
        if (isMounted) setHistory([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Cross-device realtime sync via Firebase Realtime Database.
  useEffect(() => subscribeToRealtimeNotifications(setRealtimeNotifications), []);

  useEffect(() => {
    for (const notification of liveNotifications) {
      if (syncedIds.current.has(notification.id)) continue;
      syncedIds.current.add(notification.id);
      pushNotificationToRealtimeDb(notification);
    }
  }, [liveNotifications]);

  const notifications = useMemo<AppNotification[]>(() => {
    const seen = new Set<string>();
    const merged: AppNotification[] = [];

    for (const notification of [...liveNotifications, ...realtimeNotifications, ...history]) {
      if (seen.has(notification.id)) continue;
      seen.add(notification.id);
      merged.push(notification);
    }

    return merged
      .map((notification) => (readIds.has(notification.id) ? { ...notification, read: true } : notification))
      .sort((a, b) => b.timestampMs - a.timestampMs);
  }, [liveNotifications, realtimeNotifications, history, readIds]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  function markAllRead() {
    setReadIds(new Set(notifications.map((n) => n.id)));
  }

  return { notifications, unreadCount, isLoading, markAllRead };
}
