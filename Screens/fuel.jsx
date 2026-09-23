import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { auditLog } from "../utils/auditlogger";
import { supabase } from "../lib/supabase";

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Placeholder monthly fuel budget. Replace with a per-user/vehicle
// value from a budgets table when that exists.
const SPEND_LIMIT_ZAR = 20000;

const formatZAR = (value) => {
  if (value == null || isNaN(value)) return "R0.00";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
};

const formatLitres = (value) => {
  if (value == null || isNaN(value)) return "0.0 L";
  return `${Number(value).toFixed(1)} L`;
};

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

const relativeDay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso);
};

const getBudgetStatus = (spent, limit) => {
  if (!limit || limit <= 0) {
    return {
      label: "No budget set",
      color: "#6b7280",
      barColor: "#9CA3AF",
      percent: 0,
    };
  }

  const rawPercent = (spent / limit) * 100;
  const percent = Math.min(rawPercent, 100);
  const over = spent > limit;

  if (over) {
    return {
      label: "Over budget",
      color: "#b91c1c",
      barColor: "#dc2626",
      percent: 100,
      over: true,
    };
  }

  if (rawPercent >= 75) {
    return {
      label: "Approaching limit",
      color: "#b45309",
      barColor: "#f59e0b",
      percent,
    };
  }

  return {
    label: "On track",
    color: "#15803d",
    barColor: "#22c55e",
    percent,
  };
};

const FuelScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [receipts, setReceipts] = useState([]);
  const [receiptUrls, setReceiptUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  const [vehicle, setVehicle] = useState(null);
  const [vehicleLoading, setVehicleLoading] = useState(true);

  const [previewReceipt, setPreviewReceipt] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    console.log("[fuel screen AUTH]", !!user);

    if (user) {
      auditLog({
        action: "FUEL_VIEW",
        page: "Mobile Fuel",
        description: "User viewed the Fuel & Expenses screen",
        details: { screen: "Fuel & Expenses" },
      });
    }
  }, [user]);

  // ---- Fetch the vehicle assigned to the signed-in user ----
  const fetchVehicle = useCallback(async () => {
    if (!user) {
      setVehicleLoading(false);
      return;
    }

    setVehicleLoading(true);

    try {
      // 1. Find the driver row via user_id, with email fallback
      let driverId = null;

      const { data: byUser, error: byUserErr } = await supabase
        .from("drivers")
        .select("driver_id")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log("[FuelScreen] driver by user_id:", {
        driverId: byUser?.driver_id,
        error: byUserErr?.message,
        code: byUserErr?.code,
      });

      driverId = byUser?.driver_id ?? null;

      if (!driverId && user.email) {
        const { data: byEmail, error: byEmailErr } = await supabase
          .from("drivers")
          .select("driver_id")
          .eq("email", user.email)
          .maybeSingle();

        console.log("[FuelScreen] driver by email:", {
          driverId: byEmail?.driver_id,
          error: byEmailErr?.message,
          code: byEmailErr?.code,
        });

        driverId = byEmail?.driver_id ?? null;
      }

      if (!driverId) {
        setVehicle(null);
        return;
      }

      // 2. Fetch the vehicle assigned to that driver
      const { data: veh, error: vehErr } = await supabase
        .from("vehicles")
        .select(
          "vehicle_id, registration_number, status, current_location, route_id"
        )
        .eq("driver_id", driverId)
        .maybeSingle();

      console.log("[FuelScreen] vehicle lookup:", {
        vehicleId: veh?.vehicle_id,
        registration: veh?.registration_number,
        error: vehErr?.message,
        code: vehErr?.code,
      });

      setVehicle(veh ?? null);
    } catch (e) {
      console.warn("[FuelScreen] vehicle fetch exception:", e?.message);
      setVehicle(null);
    } finally {
      setVehicleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  const fetchReceipts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError("");

      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 1);

      const { data, error: dbError } = await supabase
        .from("receipts")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      if (dbError) {
        console.error("[FuelScreen] receipts fetch failed:", {
          message: dbError.message,
          code: dbError.code,
          details: dbError.details,
        });
        setError("Could not load receipts.");
        setReceipts([]);
        return;
      }

      setReceipts(data || []);

      const urls = {};
      await Promise.all(
        (data || []).map(async (r) => {
          if (!r.receipt_image_path) return;
          try {
            const { data: signed, error: urlErr } = await supabase.storage
              .from("receipts")
              .createSignedUrl(r.receipt_image_path, 3600);
            if (!urlErr && signed?.signedUrl) {
              urls[r.id] = signed.signedUrl;
            }
          } catch (e) {
            console.warn("[FuelScreen] signed url failed for", r.id, e?.message);
          }
        })
      );
      setReceiptUrls(urls);
    } catch (e) {
      console.error("[FuelScreen] receipts exception:", e);
      setError("Could not load receipts.");
      setReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedMonth, selectedYear]);

  useEffect(() => {
    setLoading(true);
    fetchReceipts();
  }, [fetchReceipts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVehicle();
    fetchReceipts();
  }, [fetchVehicle, fetchReceipts]);

  const totalSpend = receipts.reduce(
    (sum, r) => sum + Number(r.receipt_amount || 0),
    0
  );
  const totalLitres = receipts.reduce(
    (sum, r) => sum + Number(r.fuel_purchased || 0),
    0
  );
  const refillCount = receipts.length;
  const costPerRefill = refillCount > 0 ? totalSpend / refillCount : 0;
  const avgLPer100 = 11.2;

  const remaining = SPEND_LIMIT_ZAR - totalSpend;
  const spendPercentRaw =
    SPEND_LIMIT_ZAR > 0 ? (totalSpend / SPEND_LIMIT_ZAR) * 100 : 0;
  const budget = getBudgetStatus(totalSpend, SPEND_LIMIT_ZAR);

  const openPreview = useCallback(async (receipt) => {
    setPreviewReceipt(receipt);
    setPreviewUrl(receiptUrls[receipt.id] || null);
    setPreviewLoading(true);

    try {
      const { data: signed, error: urlErr } = await supabase.storage
        .from("receipts")
        .createSignedUrl(receipt.receipt_image_path, 3600);
      if (urlErr) throw urlErr;
      setPreviewUrl(signed?.signedUrl || null);
    } catch (e) {
      console.error("[FuelScreen] preview url failed:", e?.message);
      Alert.alert("Image Error", "Could not load this receipt image.");
    } finally {
      setPreviewLoading(false);
    }
  }, [receiptUrls]);

  const closePreview = useCallback(() => {
    setPreviewReceipt(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  }, []);

  // ---- Vehicle display helpers ----
  const vehicleTitle = vehicle?.registration_number || "No vehicle assigned";
  const vehicleSubtitle = vehicle?.current_location || null;
  const vehicleStatus = vehicle?.status || null;
  const showVehicleStatusBadge = !!vehicleStatus;

  return (
    <>
      <ScrollView
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
        {/* ============================================
            HEADER
        ============================================ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fuel &amp; Expenses</Text>
          <Text style={styles.headerSubtitle}>
            {MONTHS_SHORT[selectedMonth]} {selectedYear}
          </Text>

          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>TOTAL FUEL SPEND</Text>
            <Text style={styles.heroAmount}>{formatZAR(totalSpend)}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="receipt-outline" size={14} color="#aebbd3" />
              <Text style={styles.heroMetaText}>
                {refillCount} {refillCount === 1 ? "refill" : "refills"} this month
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthContainer}
          >
            {MONTHS_SHORT.map((m, i) => {
              const active = i === selectedMonth;
              return (
                <TouchableOpacity
                  key={m}
                  style={active ? styles.activeMonth : styles.monthButton}
                  onPress={() => setSelectedMonth(i)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      active ? styles.activeMonthText : styles.monthButtonText
                    }
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ============================================
            BODY
        ============================================ */}
        <View style={styles.body}>

          {/* ===== Budget card ===== */}
          <Text style={styles.sectionTitle}>Monthly Budget</Text>

          <View style={styles.budgetCard}>
            <View style={styles.budgetTopRow}>
              <View style={styles.budgetIconWrap}>
                <Ionicons name="wallet-outline" size={20} color="#007bff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.budgetLabel}>SPEND LIMIT</Text>
                <Text style={styles.budgetLimit}>
                  {formatZAR(SPEND_LIMIT_ZAR)}
                </Text>
              </View>
              <View
                style={[
                  styles.budgetStatusBadge,
                  { backgroundColor: `${budget.color}1A` },
                ]}
              >
                <Text
                  style={[styles.budgetStatusText, { color: budget.color }]}
                >
                  {budget.label}
                </Text>
              </View>
            </View>

            <View style={styles.budgetProgressBackground}>
              <View
                style={[
                  styles.budgetProgressFill,
                  {
                    width: `${budget.percent}%`,
                    backgroundColor: budget.barColor,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetNumbersRow}>
              <Text style={styles.budgetSpent}>
                {formatZAR(totalSpend)} spent
              </Text>
              <Text style={styles.budgetPercent}>
                {spendPercentRaw.toFixed(0)}%
              </Text>
            </View>

            <View style={styles.budgetDivider} />

            <View style={styles.budgetFooterRow}>
              <View style={styles.budgetFooterCol}>
                <Text style={styles.budgetFooterLabel}>Remaining</Text>
                <Text
                  style={[
                    styles.budgetFooterValue,
                    { color: remaining < 0 ? "#b91c1c" : "#0A1F44" },
                  ]}
                >
                  {remaining < 0
                    ? `-${formatZAR(Math.abs(remaining))}`
                    : formatZAR(remaining)}
                </Text>
              </View>

              <View style={styles.budgetFooterCol}>
                <Text style={styles.budgetFooterLabel}>Refills</Text>
                <Text style={styles.budgetFooterValue}>{refillCount}</Text>
              </View>

              <View style={styles.budgetFooterCol}>
                <Text style={styles.budgetFooterLabel}>Avg / refill</Text>
                <Text style={styles.budgetFooterValue}>
                  {formatZAR(costPerRefill)}
                </Text>
              </View>
            </View>

            {budget.over && (
              <View style={styles.overBudgetBanner}>
                <Ionicons name="warning-outline" size={18} color="#fff" />
                <Text style={styles.overBudgetText}>
                  You have exceeded your monthly fuel budget by{" "}
                  {formatZAR(Math.abs(remaining))}.
                </Text>
              </View>
            )}
          </View>

          {/* ===== Stats grid ===== */}
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="water-outline" size={20} color="#007bff" />
              </View>
              <Text style={styles.statTitle}>LITRES USED</Text>
              <Text style={styles.statValue}>{totalLitres.toFixed(1)} L</Text>
              <Text style={styles.statSub}>{avgLPer100} L/100km</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="cash-outline" size={20} color="#007bff" />
              </View>
              <Text style={styles.statTitle}>COST / REFILL</Text>
              <Text style={styles.statValue}>{formatZAR(costPerRefill)}</Text>
              <Text style={styles.statSub}>avg per refill</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="flame-outline" size={20} color="#007bff" />
              </View>
              <Text style={styles.statTitle}>REFILLS</Text>
              <Text style={styles.statValue}>{refillCount}</Text>
              <Text style={styles.statSub}>this month</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons
                  name="speedometer-outline"
                  size={20}
                  color="#007bff"
                />
              </View>
              <Text style={styles.statTitle}>EFFICIENCY</Text>
              <Text style={styles.statValue}>B+</Text>
              <Text style={styles.statSub}>fleet avg: B</Text>
            </View>
          </View>

          {/* ===== Vehicle efficiency ===== */}
          <Text style={styles.sectionTitle}>Vehicle Efficiency</Text>

          <View style={styles.efficiencyCard}>
            {vehicleLoading ? (
              <View style={styles.vehicleLoadingWrap}>
                <ActivityIndicator size="small" color="#007bff" />
                <Text style={styles.loadingText}>Loading vehicle...</Text>
              </View>
            ) : !vehicle ? (
              <View style={styles.vehicleEmptyWrap}>
                <View style={styles.vehicleEmptyIcon}>
                  <Ionicons name="car-outline" size={28} color="#9CA3AF" />
                </View>
                <Text style={styles.vehicleEmptyTitle}>
                  No vehicle assigned
                </Text>
                <Text style={styles.vehicleEmptySubtitle}>
                  Ask your dispatcher to assign a vehicle to your profile to
                  track efficiency here.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.vehicleHeader}>
                  <View style={styles.vehicleIconWrap}>
                    <Ionicons name="car-outline" size={20} color="#007bff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleName} numberOfLines={1}>
                      {vehicleTitle}
                    </Text>
                    {vehicleSubtitle ? (
                      <Text style={styles.vehicleSubtitle} numberOfLines={1}>
                        {vehicleSubtitle}
                      </Text>
                    ) : null}
                  </View>
                  {showVehicleStatusBadge && (
                    <View style={styles.goodBadge}>
                      <Text style={styles.goodText}>{vehicleStatus}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.progressBackground}>
                  <View style={styles.progressFill} />
                </View>

                <View style={styles.scoreRow}>
                  <Text style={styles.score}>Score 74/100</Text>
                  <Text style={styles.actual}>11.2 L/100km</Text>
                </View>

                <Text style={styles.target}>
                  Fleet target: 10.4 L/100km
                </Text>
              </>
            )}
          </View>

          {/* ===== Receipt history ===== */}
          <Text style={styles.sectionTitle}>Receipt History</Text>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color="#007bff" />
              <Text style={styles.loadingText}>Loading receipts...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color="#d32f2f"
              />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={fetchReceipts}
              >
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : receipts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="document-text-outline"
                size={54}
                color="#9CA3AF"
              />
              <Text style={styles.emptyTitle}>No receipts this month</Text>
              <Text style={styles.emptySubtitle}>
                Scan a fuel receipt from the Location screen to see it here.
              </Text>
            </View>
          ) : (
            receipts.map((r) => {
              const thumb = receiptUrls[r.id];
              return (
                <TouchableOpacity
                  key={r.id}
                  style={styles.receiptCard}
                  activeOpacity={0.7}
                  onPress={() => openPreview(r)}
                >
                  <View style={styles.receiptThumbWrap}>
                    {thumb ? (
                      <Image
                        source={{ uri: thumb }}
                        style={styles.receiptThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.receiptThumbPlaceholder}>
                        <Ionicons
                          name="document-text-outline"
                          size={24}
                          color="#9CA3AF"
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.receiptInfo}>
                    <View style={styles.receiptTopRow}>
                      <Text
                        style={styles.receiptAmount}
                        numberOfLines={1}
                      >
                        {formatZAR(r.receipt_amount)}
                      </Text>
                      <Text style={styles.receiptDate}>
                        {relativeDay(r.created_at)}
                      </Text>
                    </View>

                    <View style={styles.receiptBottomRow}>
                      <Text style={styles.receiptMeta}>
                        {formatLitres(r.fuel_purchased)}
                      </Text>
                      <Text style={styles.receiptMeta}>
                        {formatTime(r.created_at)}
                      </Text>
                    </View>

                    {r.fuel_percent_before != null &&
                      r.fuel_percent_after != null && (
                        <Text style={styles.receiptFuelChange}>
                          Fuel {Number(r.fuel_percent_before).toFixed(0)}% →{" "}
                          {Number(r.fuel_percent_after).toFixed(0)}%
                        </Text>
                      )}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#C4C4C4"
                    style={styles.receiptChevron}
                  />
                </TouchableOpacity>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* ===== Preview modal ===== */}
      <Modal
        visible={!!previewReceipt}
        transparent={true}
        animationType="slide"
        onRequestClose={closePreview}
      >
        <View style={styles.previewOverlay}>
          <View style={styles.previewSheet}>
            <View style={styles.previewHandleWrap}>
              <View style={styles.previewHandle} />
            </View>

            <View style={styles.previewHeader}>
              <View style={styles.previewHeaderIcon}>
                <Ionicons name="receipt-outline" size={22} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>Receipt</Text>
                <Text style={styles.previewSubtitle}>
                  {previewReceipt
                    ? `${formatDate(previewReceipt.created_at)} • ${formatTime(
                        previewReceipt.created_at
                      )}`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity onPress={closePreview}>
                <Ionicons name="close-outline" size={26} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.previewBody}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {previewLoading ? (
                <View style={styles.previewImageLoading}>
                  <ActivityIndicator size="large" color="#0A1F44" />
                  <Text style={styles.loadingText}>Loading image...</Text>
                </View>
              ) : previewUrl ? (
                <View style={styles.previewImageWrap}>
                  <Image
                    source={{ uri: previewUrl }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.previewImageLoading}>
                  <Ionicons
                    name="image-outline"
                    size={48}
                    color="#9CA3AF"
                  />
                  <Text style={styles.loadingText}>Image unavailable</Text>
                </View>
              )}

              {previewReceipt && (
                <View style={styles.previewDetails}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Amount</Text>
                    <Text style={styles.previewValue}>
                      {formatZAR(previewReceipt.receipt_amount)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Fuel Purchased</Text>
                    <Text style={styles.previewValue}>
                      {formatLitres(previewReceipt.fuel_purchased)}
                    </Text>
                  </View>
                  {previewReceipt.fuel_percent_before != null &&
                    previewReceipt.fuel_percent_after != null && (
                      <View style={styles.previewRow}>
                        <Text style={styles.previewLabel}>Fuel Level</Text>
                        <Text style={styles.previewValue}>
                          {Number(
                            previewReceipt.fuel_percent_before
                          ).toFixed(0)}
                          % →{" "}
                          {Number(
                            previewReceipt.fuel_percent_after
                          ).toFixed(0)}
                          %
                        </Text>
                      </View>
                    )}
                </View>
              )}

              <TouchableOpacity
                style={styles.previewCloseBtn}
                onPress={closePreview}
              >
                <Text style={styles.previewCloseText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ebf2ff",
  },

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

  heroCard: {
    marginTop: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  heroLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "700",
    color: "#aebbd3",
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 6,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  heroMetaText: {
    fontSize: 12,
    color: "#aebbd3",
    fontWeight: "600",
    marginLeft: 6,
  },

  monthContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 18,
    paddingRight: 20,
  },
  monthButton: {
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 8,
  },
  activeMonth: {
    backgroundColor: "#3B82F6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginRight: 8,
  },
  monthButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  activeMonthText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },

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

  // ---- Budget card ----
  budgetCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  budgetTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  budgetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7a8699",
    letterSpacing: 1,
  },
  budgetLimit: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0A1F44",
    marginTop: 2,
  },
  budgetStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  budgetStatusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  budgetProgressBackground: {
    height: 10,
    backgroundColor: "#eef1f6",
    borderRadius: 6,
    marginTop: 18,
    overflow: "hidden",
  },
  budgetProgressFill: {
    height: "100%",
    borderRadius: 6,
  },
  budgetNumbersRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  budgetSpent: {
    fontSize: 12,
    color: "#4b5563",
    fontWeight: "700",
  },
  budgetPercent: {
    fontSize: 12,
    color: "#0A1F44",
    fontWeight: "800",
  },
  budgetDivider: {
    height: 1,
    backgroundColor: "#eef1f6",
    marginTop: 16,
    marginBottom: 16,
  },
  budgetFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  budgetFooterCol: {
    flex: 1,
  },
  budgetFooterLabel: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  budgetFooterValue: {
    fontSize: 14,
    color: "#0A1F44",
    fontWeight: "800",
    marginTop: 4,
  },
  overBudgetBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#b91c1c",
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  overBudgetText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 8,
    flex: 1,
  },

  // ---- Stats grid ----
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0A1F44",
    marginTop: 6,
  },
  statSub: {
    fontSize: 12,
    color: "#7a8699",
    marginTop: 2,
    fontWeight: "500",
  },

  // ---- Vehicle efficiency ----
  efficiencyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eef6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  vehicleName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: "#0A1F44",
  },
  vehicleSubtitle: {
    fontSize: 12,
    color: "#7a8699",
    marginTop: 2,
    fontWeight: "600",
  },
  goodBadge: {
    backgroundColor: "#DFF7E5",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
  goodText: {
    color: "#1b8634",
    fontWeight: "800",
    fontSize: 11,
    textTransform: "capitalize",
  },
  progressBackground: {
    height: 10,
    backgroundColor: "#eef1f6",
    borderRadius: 6,
    marginTop: 18,
    overflow: "hidden",
  },
  progressFill: {
    width: "74%",
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 6,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  score: {
    fontWeight: "800",
    color: "#0A1F44",
    fontSize: 13,
  },
  actual: {
    color: "#7a8699",
    fontSize: 13,
    fontWeight: "600",
  },
  target: {
    color: "#7a8699",
    marginTop: 6,
    fontSize: 12,
  },
  vehicleLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  vehicleEmptyWrap: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  vehicleEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#f1f4f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  vehicleEmptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0A1F44",
  },
  vehicleEmptySubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#7a8699",
    textAlign: "center",
  },

  // ---- Receipts list ----
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

  errorCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  errorText: {
    color: "#333",
    marginTop: 10,
    textAlign: "center",
    fontSize: 13,
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: "#0A1F44",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 14,
  },
  retryText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
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

  receiptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  receiptThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F1F4F9",
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  receiptThumb: {
    width: "100%",
    height: "100%",
  },
  receiptThumbPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  receiptInfo: {
    flex: 1,
  },
  receiptTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0A1F44",
  },
  receiptDate: {
    fontSize: 11,
    color: "#7a8699",
    fontWeight: "600",
  },
  receiptBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  receiptMeta: {
    fontSize: 12,
    color: "#7a8699",
    fontWeight: "500",
  },
  receiptFuelChange: {
    marginTop: 6,
    fontSize: 11,
    color: "#007AFF",
    fontWeight: "700",
  },
  receiptChevron: {
    marginLeft: 8,
  },

  // ---- Preview modal ----
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 31, 68, 0.55)",
    justifyContent: "flex-end",
  },
  previewSheet: {
    backgroundColor: "#ebf2ff",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "90%",
    overflow: "hidden",
  },
  previewHandleWrap: {
    paddingTop: 10,
    alignItems: "center",
    backgroundColor: "#ebf2ff",
  },
  previewHandle: {
    width: 45,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#c9c9c9",
  },
  previewHeader: {
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
  previewHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  previewSubtitle: {
    fontSize: 12,
    color: "#aebbd3",
    marginTop: 3,
  },
  previewBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  previewImageWrap: {
    width: "100%",
    height: 380,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewImageLoading: {
    width: "100%",
    height: 300,
    borderRadius: 16,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  previewDetails: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  previewValue: {
    fontSize: 14,
    color: "#0A1F44",
    fontWeight: "800",
  },
  previewCloseBtn: {
    backgroundColor: "#0A1F44",
    borderRadius: 15,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  previewCloseText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});

export default FuelScreen;