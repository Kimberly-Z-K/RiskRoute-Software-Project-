import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import * as Speech from "expo-speech";
import {
  MaterialCommunityIcons,
  Ionicons,
  Feather,
} from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: Date.now() + 1, // Use unique IDs
      category: "FUEL ALERTS",
      title: "Fuel at 38% — refill recommended",
      message: "2 stations detected on your route",
      time: "12 minutes ago",
      icon: "gas-station",
      iconColor: "#F59E0B",
      bg: "#FEF3C7",
      unread: true,
    },
    {
      id: Date.now() + 2,
      category: "FUEL ALERTS",
      title: "Fuel expense approved — R 1,245",
      message: "Shell Rosebank • Ref: SH-8812",
      time: "2h ago",
      icon: "receipt",
      iconColor: "#F59E0B",
      bg: "#FEF3C7",
      unread: false,
    },
    {
      id: Date.now() + 3,
      category: "ROUTE & TRAFFIC",
      title: "N3 congestion — route updated via R24",
      message: "Estimated time saving: 8 minutes",
      time: "28 minutes ago",
      icon: "map-marker-path",
      iconColor: "#3B82F6",
      bg: "#DBEAFE",
      unread: true,
    },
    {
      id: Date.now() + 4,
      category: "DELIVERIES",
      title: "Drop 4 confirmed — client signed",
      message: "Germiston Hub • DL-7721",
      time: "1h ago",
      icon: "package-variant",
      iconColor: "#10B981",
      bg: "#D1FAE5",
      unread: false,
    },
    {
      id: Date.now() + 5,
      category: "DELIVERIES",
      title: "3 deliveries pending on current route",
      message: "Next: OR Tambo, Bay 12",
      time: "3h ago",
      icon: "truck-delivery",
      iconColor: "#10B981",
      bg: "#D1FAE5",
      unread: false,
    },
    {
      id: Date.now() + 6,
      category: "VEHICLE",
      title: "Service due in 2 300 km",
      message: "Book at depot • Ref: SVC-445",
      time: "Yesterday",
      icon: "wrench",
      iconColor: "#EF4444",
      bg: "#FEE2E2",
      unread: false,
    },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  // Read unread notifications when opening screen
  useEffect(() => {
    const unread = notifications.filter((n) => n.unread);

    if (unread.length > 0) {
      unread.forEach((item, index) => {
        setTimeout(() => {
          Speech.speak(`${item.title}. ${item.message}`, {
            rate: 0.95,
          });
        }, index * 3500);
      });
    }
  }, []);

  // Simulate incoming notifications
  useEffect(() => {
    const newNotifications = [
      {
        id: Date.now() + 100, // Use unique IDs with timestamp
        category: "DELIVERIES",
        title: "New delivery assigned",
        message: "Johannesburg → Pretoria",
        time: "Just now",
        icon: "truck-fast",
        iconColor: "#10B981",
        bg: "#D1FAE5",
        unread: true,
      },
      {
        id: Date.now() + 101,
        category: "ROUTE & TRAFFIC",
        title: "Traffic alert",
        message: "Heavy congestion on N1",
        time: "Just now",
        icon: "traffic-light",
        iconColor: "#3B82F6",
        bg: "#DBEAFE",
        unread: true,
      },
    ];

    let i = 0;

    const interval = setInterval(() => {
      if (i >= newNotifications.length) {
        clearInterval(interval);
        return;
      }

      const item = newNotifications[i];
      // Ensure unique ID for each new notification
      const uniqueItem = {
        ...item,
        id: Date.now() + i + 200,
      };

      setNotifications((prev) => [uniqueItem, ...prev]);

      Speech.speak(`${item.title}. ${item.message}`);

      i++;
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        unread: false,
      }))
    );
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, unread: false } : n
      )
    );
  };

  const getCategoryColor = (category) => {
    switch(category) {
      case "FUEL ALERTS": return "#F59E0B";
      case "ROUTE & TRAFFIC": return "#3B82F6";
      case "DELIVERIES": return "#10B981";
      case "VEHICLE": return "#EF4444";
      default: return "#6B7280";
    }
  };

  const renderCategory = (category) => {
    const items = notifications.filter(
      (n) => n.category === category
    );

    if (!items.length) return null;

    const categoryColor = getCategoryColor(category);

    return (
      <View key={category} style={styles.categoryContainer}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
          <Text style={styles.section}>{category}</Text>
        </View>

        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id.toString()} // Ensure key is a string
            style={[
              styles.card,
              item.unread && styles.unreadCard,
              index === 0 && styles.firstCard,
              index === items.length - 1 && styles.lastCard,
            ]}
            onPress={() => markAsRead(item.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconBox, { backgroundColor: item.bg }]}>
              <MaterialCommunityIcons
                name={item.icon}
                size={24}
                color={item.iconColor}
              />
            </View>

            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.unread && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.message} numberOfLines={2}>
                {item.message}
              </Text>

              <View style={styles.timeContainer}>
                <Feather name="clock" size={12} color="#9CA3AF" />
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
      
      {/* Header with Gradient that covers status bar */}
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons 
              name="bell-ring" 
              size={28} 
              color="#FFFFFF" 
            />
            <Text style={styles.heading}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity 
              onPress={markAllRead}
              style={styles.markAllButton}
            >
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.readAll}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length > 0 ? (
          <>
            {renderCategory("FUEL ALERTS")}
            {renderCategory("ROUTE & TRAFFIC")}
            {renderCategory("DELIVERIES")}
            {renderCategory("VEHICLE")}
          </>
        ) : (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons 
              name="bell-off-outline" 
              size={80} 
              color="#D1D5DB" 
            />
            <Text style={styles.emptyStateTitle}>No notifications</Text>
            <Text style={styles.emptyStateText}>
              You're all caught up! Check back later for updates.
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === 'ios' ? 0 : 8,
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 10,
  },

  badgeContainer: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 10,
    minWidth: 22,
    alignItems: "center",
  },

  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },

  readAll: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },

  scrollView: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  categoryContainer: {
    marginBottom: 20,
  },

  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  section: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  firstCard: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },

  lastCard: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderBottomWidth: 0,
  },

  unreadCard: {
    backgroundColor: "#F8FAFF",
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },

  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  cardContent: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    fontWeight: "600",
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: 8,
  },

  message: {
    color: "#6B7280",
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
  },

  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },

  time: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingBottom: 40,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },

  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  bottomPadding: {
    height: 20,
  },
});