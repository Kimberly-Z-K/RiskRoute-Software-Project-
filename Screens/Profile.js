import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { base64ToBytes, detectImageType } from "../utils/base64";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { auditLog } from "../utils/auditlogger";

const AVATAR_BUCKET = "avatars";

export default function Profile() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const [userName, setUserName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [email, setEmail] = useState("");

  // Vehicle assigned to this driver
  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
    loadVehicle();
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const userId = user.id;

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("user_id, user_name, email, avatar_url")
        .eq("user_id", userId)
        .single();

      if (userError) throw userError;

      const { data: driverRow, error: driverError } = await supabase
        .from("drivers")
        .select("driver_id, driver_username, phone, license_number")
        .eq("driver_id", userId)
        .single();

      if (driverError) throw driverError;

      const profileData = {
        userName: driverRow.driver_username || userRow.user_name || "",
        email: userRow.email || "",
        phone: driverRow.phone || "",
        licenseNumber: driverRow.license_number || "",
      };

      setSaved(profileData);
      setUserName(profileData.userName);
      setEmail(profileData.email);
      setPhone(profileData.phone);
      setLicenseNumber(profileData.licenseNumber);

      // Resolve avatar URL (signed URL if the bucket is private)
      if (userRow.avatar_url) {
        try {
          const { data: signed } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(userRow.avatar_url, 3600);
          if (signed?.signedUrl) {
            setAvatarUrl(signed.signedUrl);
          } else {
            const { data: pub } = supabase.storage
              .from(AVATAR_BUCKET)
              .getPublicUrl(userRow.avatar_url);
            setAvatarUrl(pub?.publicUrl || null);
          }
        } catch (e) {
          console.warn("[Profile] avatar url resolve failed:", e?.message);
        }
      }
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---- Fetch the vehicle assigned to this user ----
  const loadVehicle = async () => {
    setVehicleLoading(true);
    try {
      let driverId = null;

      const { data: byUser } = await supabase
        .from("drivers")
        .select("driver_id")
        .eq("user_id", user.id)
        .maybeSingle();

      driverId = byUser?.driver_id ?? null;

      if (!driverId) {
        driverId = user.id;
      }

      const { data: veh } = await supabase
        .from("vehicles")
        .select("vehicle_id, registration_number")
        .eq("driver_id", driverId)
        .maybeSingle();

      setVehicle(veh ?? null);
    } catch (e) {
      console.warn("[Profile] vehicle fetch exception:", e?.message);
      setVehicle(null);
    } finally {
      setVehicleLoading(false);
    }
  };

  // ============================================
  // AVATAR UPLOAD
  // ============================================
  const uploadAvatarToSupabase = useCallback(async (uri, userId) => {
    let normalizedUri = uri;
    let copiedToCache = false;

    try {
      if (!uri.startsWith("file://")) {
        const stamp = Date.now();
        const target = `${FileSystem.cacheDirectory}avatar-${stamp}.jpg`;
        await FileSystem.copyAsync({ from: uri, to: target });
        normalizedUri = target;
        copiedToCache = true;
      }

      const info = await FileSystem.getInfoAsync(normalizedUri);
      if (!info.exists) {
        Alert.alert("Error", "Image file not found.");
        return null;
      }
      if (info.size != null && info.size < 100) {
        Alert.alert("Error", "Image file appears empty.");
        return null;
      }

      const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
        encoding: "base64",
      });
      const bytes = base64ToBytes(base64);
      if (bytes.length < 100) {
        Alert.alert("Error", "Image file appears empty.");
        return null;
      }

      const { contentType, ext } = detectImageType(bytes);
      const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(fileName, bytes, { contentType, upsert: true });

      if (error) {
        console.error("[Profile] avatar upload failed:", error);
        Alert.alert("Upload Error", error.message);
        return null;
      }

      return data.path;
    } catch (e) {
      console.error("[Profile] avatar upload exception:", e);
      Alert.alert("Error", `Failed to upload image: ${e.message}`);
      return null;
    } finally {
      if (copiedToCache) {
        try {
          await FileSystem.deleteAsync(normalizedUri, { idempotent: true });
        } catch {}
      }
    }
  }, []);

  const saveAvatarPath = useCallback(
    async (path, localUriForPreview) => {
      try {
        const userId = user.id;

        const { error: userErr } = await supabase
          .from("users")
          .update({ avatar_url: path })
          .eq("user_id", userId);

        if (userErr) throw userErr;

        // Best-effort: also mirror onto the drivers row if the column exists
        try {
          await supabase
            .from("drivers")
            .update({ avatar_url: path })
            .eq("driver_id", userId);
        } catch {}

        // Refresh the signed URL so the new image displays
        try {
          const { data: signed } = await supabase.storage
            .from(AVATAR_BUCKET)
            .createSignedUrl(path, 3600);
          if (signed?.signedUrl) {
            setAvatarUrl(signed.signedUrl);
          } else {
            const { data: pub } = supabase.storage
              .from(AVATAR_BUCKET)
              .getPublicUrl(path);
            setAvatarUrl(pub?.publicUrl || localUriForPreview);
          }
        } catch {
          setAvatarUrl(localUriForPreview);
        }

        await auditLog({
          action: "PROFILE_AVATAR_UPDATED",
          page: "Mobile Profile",
          description: "User updated their profile picture",
          details: { path },
        });
      } catch (e) {
        console.error("[Profile] save avatar path failed:", e);
        Alert.alert("Error", "Image uploaded but profile could not be updated.");
      }
    },
    [user]
  );

  const handlePickedAsset = useCallback(
    async (asset) => {
      setShowAvatarModal(false);
      if (!asset?.uri) return;

      setAvatarLoading(true);
      try {
        const path = await uploadAvatarToSupabase(asset.uri, user.id);
        if (!path) return;
        await saveAvatarPath(path, asset.uri);
        Alert.alert("Success", "Profile picture updated!");
      } finally {
        setAvatarLoading(false);
      }
    },
    [user, uploadAvatarToSupabase, saveAvatarPath]
  );

  const pickAvatarFromLibrary = useCallback(async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Gallery access is required to pick a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      await handlePickedAsset(result.assets[0]);
    }
  }, [handlePickedAsset]);

  const takeAvatarWithCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera access is required to take a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      await handlePickedAsset(result.assets[0]);
    }
  }, [handlePickedAsset]);

  const openAvatarOptions = useCallback(() => {
    setShowAvatarModal(true);

    auditLog({
      action: "PROFILE_AVATAR_OPEN",
      page: "Mobile Profile",
      description: "User opened the profile picture picker",
    });
  }, []);

  // ============================================
  // SAVE PROFILE
  // ============================================
  const handleSave = async () => {
    if (
      !userName.trim() ||
      !phone.trim() ||
      !licenseNumber.trim() ||
      !email.trim()
    ) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);

      const userId = user.id;

      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          user_name: userName.trim(),
          email: email.trim(),
        })
        .eq("user_id", userId);

      if (userUpdateError) throw userUpdateError;

      const { error: driverUpdateError } = await supabase
        .from("drivers")
        .update({
          driver_username: userName.trim(),
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

      await auditLog({
        action: "PROFILE_UPDATE",
        page: "Mobile Profile",
        description: "User updated their profile information",
        details: {
          updated_fields: ["user_name", "email", "phone", "license_number"],
        },
      });

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

  const vehicleTitle = vehicle?.registration_number || "No vehicle assigned";

  const topPadding =
    insets?.top > 0
      ? insets.top
      : Platform.OS === "android"
      ? StatusBar.currentHeight || 24
      : 44;

  // ---------- Small skeleton helper ----------
  const Skeleton = ({ w = "60%", h = 14, mt = 0, mb = 0, r = 7 }) => (
    <View
      style={{
        width: w,
        height: h,
        borderRadius: r,
        backgroundColor: "#E5E9F0",
        marginTop: mt,
        marginBottom: mb,
      }}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingBottom: 40 + (insets?.bottom || 0),
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0A1F44", "#0A1F44"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: topPadding + 16 }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileCard}>
              <View style={styles.profileImageContainer}>
                <TouchableOpacity
                  onPress={openAvatarOptions}
                  activeOpacity={0.85}
                  disabled={avatarLoading}
                >
                  <View style={styles.profileImage}>
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={styles.profileImageImg}
                      />
                    ) : (
                      <Text style={styles.initials}>{getInitials()}</Text>
                    )}
                    {avatarLoading && (
                      <View style={styles.profileImageOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.editIcon}
                  onPress={openAvatarOptions}
                  disabled={avatarLoading}
                >
                  <Feather name="camera" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.profileInfo}>
                {loading && !saved?.userName ? (
                  <Skeleton w="55%" h={20} mb={8} />
                ) : (
                  <Text style={styles.profileName}>
                    {saved?.userName || "Driver"}
                  </Text>
                )}
                <View style={styles.statusContainer}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Active</Text>
                </View>
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
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="user" size={18} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Personal Details</Text>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Username</Text>
                    {loading && !saved?.userName ? (
                      <Skeleton w="70%" mt={6} />
                    ) : (
                      <Text style={styles.value}>{saved?.userName || "—"}</Text>
                    )}
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>Email</Text>
                    {loading && !saved?.email ? (
                      <Skeleton w="80%" mt={6} />
                    ) : (
                      <Text style={styles.value}>{saved?.email || "—"}</Text>
                    )}
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
                    {loading && !saved?.phone ? (
                      <Skeleton w="70%" mt={6} />
                    ) : (
                      <Text style={styles.value}>{saved?.phone || "—"}</Text>
                    )}
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.label}>License Number</Text>
                    {loading && !saved?.licenseNumber ? (
                      <Skeleton w="70%" mt={6} />
                    ) : (
                      <Text style={styles.value}>{saved?.licenseNumber || "—"}</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* ===== Vehicle assigned to this driver ===== */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons
                    name="car"
                    size={18}
                    color="#3B82F6"
                  />
                  <Text style={styles.sectionTitle}>Assigned Vehicle</Text>
                </View>

                {vehicleLoading ? (
                  <View style={styles.vehicleHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Registration</Text>
                      <Skeleton w="55%" h={16} mt={6} />
                    </View>
                  </View>
                ) : !vehicle ? (
                  <View style={styles.vehicleEmptyRow}>
                    <Ionicons name="car-outline" size={22} color="#9CA3AF" />
                    <Text style={styles.vehicleEmptyText}>
                      No vehicle assigned to your profile yet.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.vehicleHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Registration</Text>
                      <Text style={styles.vehicleReg}>{vehicleTitle}</Text>
                    </View>
                  </View>
                )}
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

      {/* AVATAR PICKER MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAvatarModal}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.avatarModalOverlay}>
          <View
            style={[
              styles.avatarModalSheet,
              { paddingBottom: insets?.bottom || 0 },
            ]}
          >
            <View style={styles.avatarModalHandleWrap}>
              <View style={styles.avatarModalHandle} />
            </View>

            <View style={styles.avatarModalHeader}>
              <View style={styles.avatarModalHeaderIcon}>
                <Feather name="camera" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarModalTitle}>Profile Picture</Text>
                <Text style={styles.avatarModalSubtitle}>
                  Choose how to update your photo
                </Text>
              </View>
            </View>

            <View style={styles.avatarModalBody}>
              <TouchableOpacity
                style={styles.avatarOption}
                onPress={takeAvatarWithCamera}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarOptionIcon, { backgroundColor: "#e0f2fe" }]}>
                  <Ionicons name="camera" size={22} color="#0369a1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarOptionTitle}>Take Photo</Text>
                  <Text style={styles.avatarOptionHint}>
                    Use your camera right now
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarOption}
                onPress={pickAvatarFromLibrary}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarOptionIcon, { backgroundColor: "#ede9fe" }]}>
                  <Ionicons name="images" size={22} color="#6d28d9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarOptionTitle}>
                    Choose from Gallery
                  </Text>
                  <Text style={styles.avatarOptionHint}>
                    Pick an existing photo
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.avatarOption, { marginTop: 4 }]}
                onPress={() => setShowAvatarModal(false)}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarOptionIcon, { backgroundColor: "#fee2e2" }]}>
                  <Ionicons name="close" size={22} color="#b91c1c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.avatarOptionTitle}>Cancel</Text>
                  <Text style={styles.avatarOptionHint}>Keep current photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
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
    overflow: "hidden",
  },
  profileImageImg: {
    width: "100%",
    height: "100%",
  },
  profileImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
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

  // ---- Vehicle section ----
  vehicleLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  vehicleLoadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
  vehicleEmptyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  vehicleEmptyText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  vehicleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleReg: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "700",
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

  // ---- Avatar modal ----
  avatarModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 68, 0.55)",
    justifyContent: "flex-end",
  },
  avatarModalSheet: {
    backgroundColor: "#ebf2ff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  avatarModalHandleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: "center",
    backgroundColor: "#ebf2ff",
  },
  avatarModalHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c9c9c9",
  },
  avatarModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0A1F44",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    marginTop: 8,
  },
  avatarModalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  avatarModalSubtitle: {
    fontSize: 12,
    color: "#aebbd3",
    marginTop: 3,
  },
  avatarModalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  avatarOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarOptionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A1F44",
  },
  avatarOptionHint: {
    fontSize: 12,
    color: "#7a8699",
    marginTop: 2,
  },
});