import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as Speech from "expo-speech";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

// Notifications created by admin actions (spending allocated, vehicle or route
// assigned). They are written by database triggers into driver_notifications;
// this provider loads them and listens for new ones, so they arrive live and
// are still there if the app was closed when they happened.

const Ctx = createContext({
  items: [],
  unreadCount: 0,
  markRead: async () => {},
  markAllRead: async () => {},
  reload: async () => {},
});

export const useAdminNotifications = () => useContext(Ctx);

export function AdminNotificationsProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const reload = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from("driver_notifications")
      .select("id, type, title, message, data, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[adminNotifications] load failed:", error.message);
      return;
    }
    setItems(data || []);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    reload();

    const channel = supabase
      .channel(`driver-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "driver_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new;
          setItems((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [row, ...prev]
          );
          Speech.speak(`${row.title}. ${row.message || ""}`, {
            rate: 0.9,
            pitch: 1.0,
            language: "en",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, reload]);

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const { error } = await supabase
      .from("driver_notifications")
      .update({ read: true })
      .eq("id", id);
    if (error) console.warn("[adminNotifications] markRead failed:", error.message);
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const { error } = await supabase
      .from("driver_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (error) console.warn("[adminNotifications] markAllRead failed:", error.message);
  }, [user?.id]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, markRead, markAllRead, reload }),
    [items, unreadCount, markRead, markAllRead, reload]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
