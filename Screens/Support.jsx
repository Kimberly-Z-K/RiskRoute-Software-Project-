import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { auditLog } from "../utils/auditlogger";
import { supabase } from "../lib/supabase";

const { width, height } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SUPPORT_PHONE = "+27644342855";
const SUPPORT_EMAIL = "support@fleet.co.za";
const SUPPORT_WHATSAPP = "+27644342855";

const TICKET_CATEGORIES = [
  {
    key: "app_issue",
    label: "App Issue",
    icon: "phone-portrait-outline",
    color: "#7c3aed",
  },
  {
    key: "fuel_issue",
    label: "Fuel / Receipt",
    icon: "flame-outline",
    color: "#dc2626",
  },
  {
    key: "route_issue",
    label: "Route / Trip",
    icon: "navigate-outline",
    color: "#007bff",
  },
  {
    key: "vehicle_issue",
    label: "Vehicle",
    icon: "construct-outline",
    color: "#d97706",
  },
  {
    key: "safety_issue",
    label: "Safety",
    icon: "shield-outline",
    color: "#b91c1c",
  },
  {
    key: "other",
    label: "Other",
    icon: "ellipsis-horizontal-circle-outline",
    color: "#6b7280",
  },
];

const FAQS = [
  {
    q: "How do I scan a fuel receipt?",
    a: "Open the Fuel & Expenses screen and tap 'Scan Fuel Receipt'. You can either take a photo or choose one from your gallery. The app will try to detect the amount automatically — confirm or adjust it, then submit.",
  },
  {
    q: "My receipt image isn't showing. What should I do?",
    a: "First, pull down to refresh the Fuel screen. If it still doesn't show, the upload may have failed. Try submitting the receipt again and make sure you have a stable internet connection.",
  },
  {
    q: "How do I pause an active trip?",
    a: "On the Location screen, scroll down to Quick Actions and tap 'Pause Trip'. Select a category (Resting, Lunch, Route Issues, Vehicle Issues), add notes if needed, and confirm.",
  },
  {
    q: "Why can't I see my fuel allocation?",
    a: "Fuel allocations are set by your dispatcher on the admin side. If your allocation card shows 'No fuel allocated', contact your fleet manager to have one assigned.",
  },
  {
    q: "How do I end a trip?",
    a: "On the Location screen, tap 'End Trip' under Quick Actions. Confirm the prompt and the app will log the trip's end time and duration.",
  },
  {
    q: "What if I have a vehicle breakdown?",
    a: "Pause your trip with the 'Vehicle Issues' category, then use the Emergency SOS card on this Support screen to call the support line immediately.",
  },
  {
    q: "How do I update my profile?",
    a: "Open the Profile screen, tap 'Edit Profile', update your phone or license number, then save. Username and email changes require admin approval.",
  },
];

const SupportScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [openFaq, setOpenFaq] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketCategory, setTicketCategory] = useState(null);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (user) {
      auditLog({
        action: "SUPPORT_VIEW",
        page: "Mobile Support",
        description: "User opened the Support screen",
        details: { screen: "Support" },
      });
    }
  }, [user]);

  // ============================================
  // FETCH USER TICKETS
  // ============================================
  const fetchTickets = useCallback(async () => {
    if (!user) {
      setTicketsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id, category, subject, description, status, priority, created_at, resolved_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("[Support] tickets fetch failed:", error);
        setTickets([]);
        return;
      }

      setTickets(data || []);
    } catch (e) {
      console.warn("[Support] tickets exception:", e?.message);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTickets();
  }, [fetchTickets]);

  // ============================================
  // CONTACT HANDLERS
  // ============================================
  const callSupport = useCallback(async () => {
    const url = `tel:${SUPPORT_PHONE}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Not available", "Calling is not supported on this device.");
      return;
    }

    await auditLog({
      action: "SUPPORT_CALL",
      page: "Mobile Support",
      description: "User tapped Call Support",
      details: { phone: SUPPORT_PHONE },
    });

    Linking.openURL(url);
  }, []);

  const emailSupport = useCallback(async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=Fleet%20Support%20Request`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Not available", "Email is not supported on this device.");
      return;
    }

    await auditLog({
      action: "SUPPORT_EMAIL",
      page: "Mobile Support",
      description: "User tapped Email Support",
      details: { email: SUPPORT_EMAIL },
    });

    Linking.openURL(url);
  }, []);

  const whatsappSupport = useCallback(async () => {
    const url = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Not available", "WhatsApp is not installed.");
      return;
    }

    await auditLog({
      action: "SUPPORT_WHATSAPP",
      page: "Mobile Support",
      description: "User tapped WhatsApp Support",
      details: { phone: SUPPORT_WHATSAPP },
    });

    Linking.openURL(url);
  }, []);

  const openEmergency = useCallback(() => {
    Alert.alert(
      "Emergency Support",
      "This will call the 24/7 emergency line immediately. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call Now",
          style: "destructive",
          onPress: () => {
            auditLog({
              action: "SUPPORT_EMERGENCY_CALL",
              page: "Mobile Support",
              description: "User initiated emergency call",
              details: { phone: SUPPORT_PHONE },
            });
            Linking.openURL(`tel:${SUPPORT_PHONE}`);
          },
        },
      ]
    );
  }, []);

  // ============================================
  // TICKET FORM
  // ============================================
  const openTicketModal = useCallback((presetCategory) => {
    setTicketCategory(presetCategory || null);
    setTicketSubject("");
    setTicketDescription("");
    setShowTicketModal(true);
  }, []);

  const closeTicketModal = useCallback(() => {
    setShowTicketModal(false);
    setTicketCategory(null);
    setTicketSubject("");
    setTicketDescription("");
  }, []);

  const submitTicket = useCallback(async () => {
    if (!ticketCategory) {
      Alert.alert("Missing Category", "Please choose a category.");
      return;
    }
    if (!ticketSubject.trim()) {
      Alert.alert("Missing Subject", "Please enter a short subject.");
      return;
    }
    if (!ticketDescription.trim()) {
      Alert.alert("Missing Details", "Please describe your issue.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          category: ticketCategory,
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          status: "open",
          priority: "normal",
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error("[Support] ticket insert failed:", error);
        Alert.alert("Error", error.message || "Failed to submit ticket.");
        return;
      }

      await auditLog({
        action: "SUPPORT_TICKET_CREATED",
        page: "Mobile Support",
        description: `User created support ticket: ${ticketSubject.trim()}`,
        details: {
          category: ticketCategory,
          ticket_id: data?.id,
        },
      });

      closeTicketModal();
      fetchTickets();

      Alert.alert(
        "Ticket Submitted",
        "Our support team will get back to you shortly. You can track this ticket below.",
        [{ text: "OK" }]
      );
    } catch (e) {
      console.error("[Support] ticket exception:", e);
      Alert.alert("Error", "Failed to submit ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [user, ticketCategory, ticketSubject, ticketDescription, closeTicketModal, fetchTickets]);

  // ============================================
  // FAQ TOGGLE
  // ============================================
  const toggleFaq = useCallback((index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq((prev) => (prev === index ? null : index));

    auditLog({
      action: "SUPPORT_FAQ_OPEN",
      page: "Mobile Support",
      description: `User opened FAQ: ${FAQS[index].q}`,
      details: { faq_index: index },
    });
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  const formatDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case "open":
        return { bg: "#fef3c7", text: "#b45309" };
      case "in_progress":
        return { bg: "#dbeafe", text: "#1d4ed8" };
      case "resolved":
        return { bg: "#dcfce7", text: "#15803d" };
      case "closed":
        return { bg: "#e5e7eb", text: "#4b5563" };
      default:
        return { bg: "#eef2f7", text: "#6b7280" };
    }
  };

  const getCategoryMeta = (key) => {
    return (
      TICKET_CATEGORIES.find((c) => c.key === key) || {
        label: "Other",
        icon: "help-circle-outline",
        color: "#6b7280",
      }
    );
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0A1F44"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help &amp; Support</Text>
          <Text style={styles.headerSubtitle}>
            We're here 24/7 for you and your fleet
          </Text>

          {/* Emergency Card */}
          <TouchableOpacity
            style={styles.emergencyCard}
            onPress={openEmergency}
            activeOpacity={0.9}
          >
            <View style={styles.emergencyIconWrap}>
              <Ionicons name="warning" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.emergencyTitle}>Emergency Line</Text>
              <Text style={styles.emergencySubtitle}>
                Immediate assistance 24/7
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* BODY */}
        <View style={styles.body}>

          {/* QUICK CONTACT */}
          <Text style={styles.sectionTitle}>Get in Touch</Text>

          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactCard}
              onPress={callSupport}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: "#e0f2fe" }]}>
                <Ionicons name="call" size={22} color="#0369a1" />
              </View>
              <Text style={styles.contactLabel}>Call</Text>
              <Text style={styles.contactHint}>Speak to us</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              onPress={emailSupport}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: "#ede9fe" }]}>
                <Ionicons name="mail" size={22} color="#6d28d9" />
              </View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactHint}>Send a message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCard}
              onPress={whatsappSupport}
              activeOpacity={0.85}
            >
              <View style={[styles.contactIconWrap, { backgroundColor: "#dcfce7" }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#15803d" />
              </View>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactHint}>Chat with us</Text>
            </TouchableOpacity>
          </View>

          {/* REPORT AN ISSUE */}
          <Text style={styles.sectionTitle}>Report an Issue</Text>

          <View style={styles.reportCard}>
            <Text style={styles.reportHeading}>
              Choose a category to get started
            </Text>
            <View style={styles.categoriesGrid}>
              {TICKET_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.categoryTile}
                  onPress={() => openTicketModal(cat.key)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: `${cat.color}1A` },
                    ]}
                  >
                    <Ionicons name={cat.icon} size={20} color={cat.color} />
                  </View>
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FAQ */}
          <Text style={styles.sectionTitle}>Frequently Asked</Text>

          <View style={styles.faqCard}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <View key={index} style={styles.faqItem}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleFaq(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <Ionicons
                      name={isOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#7a8699"
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  )}
                  {index < FAQS.length - 1 && <View style={styles.faqDivider} />}
                </View>
              );
            })}
          </View>

          {/* MY TICKETS */}
          <Text style={styles.sectionTitle}>My Tickets</Text>

          {ticketsLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#0A1F44" />
              <Text style={styles.loadingText}>Loading tickets...</Text>
            </View>
          ) : tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>No tickets yet</Text>
              <Text style={styles.emptySubtitle}>
                When you report an issue, it will show up here.
              </Text>
            </View>
          ) : (
            tickets.map((t) => {
              const meta = getCategoryMeta(t.category);
              const statusStyle = getStatusStyle(t.status);
              return (
                <View key={t.id} style={styles.ticketCard}>
                  <View style={styles.ticketTopRow}>
                    <View
                      style={[
                        styles.ticketIconWrap,
                        { backgroundColor: `${meta.color}1A` },
                      ]}
                    >
                      <Ionicons name={meta.icon} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketSubject} numberOfLines={1}>
                        {t.subject}
                      </Text>
                      <Text style={styles.ticketMeta} numberOfLines={1}>
                        {meta.label} · {formatDate(t.created_at)}{" "}
                        {formatTime(t.created_at)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusStyle.bg },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: statusStyle.text }]}
                      >
                        {(t.status || "open").replace("_", " ")}
                      </Text>
                    </View>
                  </View>

                  {t.description ? (
                    <Text style={styles.ticketDescription} numberOfLines={2}>
                      {t.description}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* TICKET MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTicketModal}
        onRequestClose={closeTicketModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandleWrap}>
                <View style={styles.modalHandle} />
              </View>

              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderIcon}>
                  <Ionicons name="chatbubble-outline" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Report an Issue</Text>
                  <Text style={styles.modalSubtitle}>
                    Tell us what's happening and we'll help
                  </Text>
                </View>
                <TouchableOpacity onPress={closeTicketModal}>
                  <Ionicons name="close-outline" size={26} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Category chips */}
                <Text style={styles.modalSectionTitle}>Category</Text>
                <View style={styles.chipRow}>
                  {TICKET_CATEGORIES.map((cat) => {
                    const active = ticketCategory === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        style={[
                          styles.chip,
                          active && {
                            backgroundColor: `${cat.color}1A`,
                            borderColor: cat.color,
                          },
                        ]}
                        onPress={() => setTicketCategory(cat.key)}
                        activeOpacity={0.85}
                      >
                        <Ionicons
                          name={cat.icon}
                          size={14}
                          color={active ? cat.color : "#7a8699"}
                        />
                        <Text
                          style={[
                            styles.chipText,
                            active && { color: cat.color, fontWeight: "800" },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subject */}
                <Text style={styles.modalSectionTitle}>Subject</Text>
                <View style={styles.inputCard}>
                  <TextInput
                    style={styles.input}
                    placeholder="Short summary of the issue"
                    placeholderTextColor="#9CA3AF"
                    value={ticketSubject}
                    onChangeText={setTicketSubject}
                    maxLength={100}
                  />
                </View>

                {/* Description */}
                <Text style={styles.modalSectionTitle}>Details</Text>
                <View style={[styles.inputCard, { minHeight: 140 }]}>
                  <TextInput
                    style={[styles.input, { minHeight: 110, textAlignVertical: "top" }]}
                    placeholder="Describe what happened, when, and any error messages you saw..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    value={ticketDescription}
                    onChangeText={setTicketDescription}
                    maxLength={1000}
                  />
                </View>
                <Text style={styles.charCount}>
                  {ticketDescription.length}/1000
                </Text>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnCancel]}
                    onPress={closeTicketModal}
                    disabled={submitting}
                  >
                    <Ionicons name="close-outline" size={18} color="#0A1F44" />
                    <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      styles.modalBtnPrimary,
                      submitting && { opacity: 0.7 },
                    ]}
                    onPress={submitTicket}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.modalBtnTextPrimary}>
                          Submitting...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="send-outline" size={18} color="#fff" />
                        <Text style={styles.modalBtnTextPrimary}>Submit</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebf2ff",
  },

  // ---------- Header ----------
  header: {
    backgroundColor: "#0A1F44",
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#aebbd3",
    marginTop: 4,
    fontWeight: "600",
  },

  // ---------- Emergency card ----------
  emergencyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    marginTop: 20,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  emergencyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emergencyTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  emergencySubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },

  // ---------- Body ----------
  body: {
    paddingTop: 8,
    paddingBottom: 40,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#171717",
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },

  // ---------- Contact row ----------
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 16,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0A1F44",
  },
  contactHint: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "600",
    marginTop: 2,
  },

  // ---------- Report an issue ----------
  reportCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  reportHeading: {
    fontSize: 13,
    color: "#7a8699",
    fontWeight: "700",
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryTile: {
    width: "31%",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eef2f7",
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0A1F44",
    textAlign: "center",
    lineHeight: 14,
  },

  // ---------- FAQ ----------
  faqCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  faqItem: {
    paddingVertical: 4,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#0A1F44",
    marginRight: 12,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 20,
    paddingBottom: 14,
    paddingRight: 20,
  },
  faqDivider: {
    height: 1,
    backgroundColor: "#eef2f7",
  },

  // ---------- Tickets ----------
  loadingCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  loadingText: {
    marginTop: 10,
    color: "#7a8699",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "800",
    color: "#0A1F44",
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#7a8699",
    textAlign: "center",
  },
  ticketCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ticketTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ticketIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0A1F44",
  },
  ticketMeta: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "600",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "capitalize",
  },
  ticketDescription: {
    fontSize: 12,
    color: "#4b5563",
    marginTop: 10,
    lineHeight: 17,
  },

  // ---------- Ticket Modal ----------
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 68, 0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#ebf2ff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: height * 0.9,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHandleWrap: {
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: "center",
    backgroundColor: "#ebf2ff",
  },
  modalHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c9c9c9",
  },
  modalHeader: {
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
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#aebbd3",
    marginTop: 3,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0A1F44",
    marginTop: 8,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  chipText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "#7a8699",
  },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eef2f7",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  input: {
    fontSize: 15,
    color: "#0A1F44",
    padding: 0,
    fontWeight: "600",
  },
  charCount: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "600",
    textAlign: "right",
    marginTop: -6,
    marginBottom: 12,
  },

  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 15,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnPrimary: {
    backgroundColor: "#0A1F44",
  },
  modalBtnCancel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c9c9c9",
  },
  modalBtnTextPrimary: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },
  modalBtnTextCancel: {
    color: "#0A1F44",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },
});

export default SupportScreen;