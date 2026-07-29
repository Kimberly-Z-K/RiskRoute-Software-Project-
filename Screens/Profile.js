import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [email, setEmail] = useState("");

  const [vehicle, setVehicle] = useState("Volvo FH Truck");
  const [plate, setPlate] = useState("CA 123-456");
  const [rating, setRating] = useState("4.8");
  const [trips, setTrips] = useState(128);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user]);

const loadProfile = async () => {
  try {
    setLoading(true);

    const userId = user.id;

    const { data: userRow, error: userError } = await supabase
      .from("users")
      .select("user_id, user_name, email")
      .eq("user_id", userId)
      .single();

    if (userError) throw userError;

    const { data: driverRow, error: driverError } = await supabase
      .from("drivers")
      .select("driver_id, driver_username, phone, license_number") // Add driver_username here
      .eq("driver_id", userId)
      .single();

    if (driverError) throw driverError;

    const profileData = {
      userName: driverRow.driver_username || userRow.user_name || "", // Use driver_username from drivers table
      email: userRow.email || "",
      phone: driverRow.phone || "",
      licenseNumber: driverRow.license_number || "",
    };

    setSaved(profileData);
    setUserName(profileData.userName);
    setEmail(profileData.email);
    setPhone(profileData.phone);
    setLicenseNumber(profileData.licenseNumber);
  } catch (err) {
    Alert.alert("Error", err.message);
  } finally {
    setLoading(false);
  }
};

const handleSave = async () => {
  if (!userName.trim() || !phone.trim() || !licenseNumber.trim() || !email.trim()) {
    Alert.alert("Error", "Please fill in all required fields");
    return;
  }

  try {
    setSaving(true);

    const userId = user.id;

    // Update users table
    const { error: userUpdateError } = await supabase
      .from("users")
      .update({
        user_name: userName.trim(),
        email: email.trim(),
      })
      .eq("user_id", userId);

    if (userUpdateError) throw userUpdateError;

    // Update drivers table with driver_username
    const { error: driverUpdateError } = await supabase
      .from("drivers")
      .update({
        driver_username: userName.trim(), // Add this line
        phone: phone.trim(),
        license_number: licenseNumber.trim(),
      })
      .eq("driver_id", userId);

    if (driverUpdateError) throw driverUpdateError;

    const profileData = {
      userName: userName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      licenseNumber: licenseNumber.trim(),
    };

    setSaved(profileData);
    setEditing(false);
    Alert.alert("Success", "Profile saved successfully!");
  } catch (err) {
    Alert.alert("Save Error", err.message);
  } finally {
    setSaving(false);
  }
};

  const handleEdit = () => {
    if (saved) {
      setUserName(saved.userName || "");
      setEmail(saved.email || "");
      setPhone(saved.phone || "");
      setLicenseNumber(saved.licenseNumber || "");
    }
    setEditing(true);
  };

  const handleCancel = () => {
    if (saved) {
      setUserName(saved.userName || "");
      setEmail(saved.email || "");
      setPhone(saved.phone || "");
      setLicenseNumber(saved.licenseNumber || "");
    }
    setEditing(false);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      if (signOut) await signOut();
    } catch (err) {
      Alert.alert("Logout Error", err.message);
    }
  };

  const getInitials = () => {
    if (saved?.userName) {
      return saved.userName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    return "DR";
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#1E40AF", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileCard}>
              <View style={styles.profileImageContainer}>
                <View style={styles.profileImage}>
                  <Text style={styles.initials}>{getInitials()}</Text>
                </View>
                <TouchableOpacity style={styles.editIcon}>
                  <Feather name="edit-2" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {saved?.userName || "Driver"}
                </Text>
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Active · Route DR-2241</Text>
                </View>
              </View>
            </View>

            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{saved ? "4" : "0"}</Text>
                <Text style={styles.quickStatLabel}>TRIPS TODAY</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{saved ? "127" : "0"}</Text>
                <Text style={styles.quickStatLabel}>KM TODAY</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>{saved ? "R412" : "R0"}</Text>
                <Text style={styles.quickStatLabel}>FUEL TODAY</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.card}>
          {editing ? (
            <>
              <Text style={styles.title}>Edit Profile</Text>
              <Text style={styles.subtitle}>Update your personal information</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Username</Text>
                <TextInput
                  placeholder="Enter your username"
                  value={userName}
                  onChangeText={setUserName}
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  placeholder="Enter your phone number"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>License Number</Text>
                <TextInput
                  placeholder="Enter your license number"
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  style={styles.input}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  keyboardType="email-address"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.saveButton, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {saving ? "Saving..." : "Save Profile"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.profileHeader}>
                <Text style={styles.name}>{saved?.userName}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text style={styles.rating}>{rating} ⭐</Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="user" size={18} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Username</Text>
                    <Text style={styles.value}>{saved?.userName}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{saved?.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="truck"
                    size={18}
                    color="#3B82F6"
                  />
                  <Text style={styles.sectionTitle}>Driver Info</Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Phone</Text>
                    <Text style={styles.value}>{saved?.phone}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>License Number</Text>
                    <Text style={styles.value}>{saved?.licenseNumber}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="bar-chart-2" size={18} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Performance</Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Total Trips</Text>
                    <Text style={styles.value}>{trips}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Rating</Text>
                    <Text style={styles.value}>{rating} ⭐</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Feather name="edit-2" size={18} color="#FFFFFF" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#DC2626" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    marginBottom: 70,
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight + 10,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 16,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  initials: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E40AF",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
    marginRight: 6,
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    opacity: 0.9,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingVertical: 12,
  },
  quickStat: {
    alignItems: "center",
    flex: 1,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
  },
  section: {
    width: "100%",
    marginTop: 16,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E40AF",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  value: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
    marginTop: 4,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    backgroundColor: "#3B82F6",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    backgroundColor: "#FEE2E2",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
});