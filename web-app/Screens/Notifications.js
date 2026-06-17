import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import * as Speech from "expo-speech";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const speak = (text) => {
    Speech.stop();
    Speech.speak(text);
  };

  // 🚚 SYSTEM GENERATED NOTIFICATIONS (NO INPUT, NO LOOP SPAM)
  useEffect(() => {
    const events = [
      {
        id: 1,
        type: "delivery",
        title: "New Delivery Assigned",
        message: "Johannesburg → Pretoria",
        mode: "response",
      },
      {
        id: 2,
        type: "traffic",
        title: "Traffic Alert",
        message: "Heavy congestion on N1 route",
        mode: "ack",
      },
      {
        id: 3,
        type: "system",
        title: "System Update",
        message: "Route optimized automatically",
        mode: "info",
      },
    ];

    let index = 0;

    const interval = setInterval(() => {
      if (index < events.length) {
        const newNotif = {
          ...events[index],
          time: "Just now",
          status: "unread",
          action: null,
        };

        setNotifications((prev) => {
          const updated = [newNotif, ...prev];

          const unread = updated.filter((n) => n.status === "unread").length;
          setUnreadCount(unread);

          speak(`${unread} new notification(s)`);

          return updated;
        });

        index++;
      } else {
        clearInterval(interval);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // ✔ Delivery actions
  const handleAction = (id, action) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, action, status: "read" } : n
      )
    );
  };

  // 🚦 Traffic acknowledge
  const acknowledge = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: "read" } : n
      )
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>
        Notifications ({unreadCount})
      </Text>

      {notifications.map((item) => (
        <View
          key={item.id}
          style={[
            styles.card,
            item.type === "delivery" && styles.delivery,
            item.type === "traffic" && styles.traffic,
            item.type === "system" && styles.system,
          ]}
        >
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.message}>{item.message}</Text>

          {/* DELIVERY ACTIONS */}
          {item.mode === "response" && item.action === null && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleAction(item.id, "Accepted")}
              >
                <Text>Yes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleAction(item.id, "Maybe")}
              >
                <Text>Maybe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btn}
                onPress={() => handleAction(item.id, "Declined")}
              >
                <Text>No</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TRAFFIC (ONLY ACK) */}
          {item.mode === "ack" && item.status === "unread" && (
            <TouchableOpacity
              style={styles.ackBtn}
              onPress={() => {
                acknowledge(item.id);
                speak("Traffic acknowledged");
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                OK
              </Text>
            </TouchableOpacity>
          )}

          {/* SYSTEM (NO ACTIONS) */}
          {item.mode === "info" && (
            <Text style={styles.systemText}>
              System notification
            </Text>
          )}

          {/* STATUS */}
          {item.status === "read" && (
            <Text style={styles.read}>✓ Read</Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f8",
    padding: 15,
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
  },

  delivery: {
    borderLeftWidth: 5,
    borderLeftColor: "#4CAF50",
  },

  traffic: {
    borderLeftWidth: 5,
    borderLeftColor: "#FF9800",
  },

  system: {
    borderLeftWidth: 5,
    borderLeftColor: "#9C27B0",
  },

  title: {
    fontWeight: "bold",
    fontSize: 15,
  },

  message: {
    color: "#555",
    marginTop: 5,
  },

  actions: {
    flexDirection: "row",
    marginTop: 10,
  },

  btn: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 8,
    marginHorizontal: 3,
    borderRadius: 8,
    alignItems: "center",
  },

  ackBtn: {
    marginTop: 10,
    backgroundColor: "#FF9800",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  systemText: {
    marginTop: 10,
    fontStyle: "italic",
    color: "#777",
  },

  read: {
    marginTop: 10,
    color: "green",
    fontWeight: "bold",
  },
});