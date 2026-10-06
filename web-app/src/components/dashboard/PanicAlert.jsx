import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  AlertTriangle,
  MapPin,
  Car,
  User,
  Clock,
  CheckCircle,
  X,
} from "lucide-react";

import "./PanicAlert.css";

const PanicAlert = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // ---------------------------------------------------------
  // LOAD ACTIVE PANIC ALERTS
  // ---------------------------------------------------------
  const loadActiveAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("panic_alerts")
        .select("*")
        .eq("status", "ACTIVE")
        .order("triggered_at", { ascending: false });

      if (error) {
        console.error("Failed to load panic alerts:", error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error("Panic alert loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // SUPABASE REALTIME
  // ---------------------------------------------------------
  useEffect(() => {
    loadActiveAlerts();

    const channel = supabase
      .channel("riskroute-panic-alerts")

      // NEW PANIC ALERT
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          console.log("🚨 NEW PANIC ALERT:", payload.new);

          if (payload.new.status === "ACTIVE") {
            setAlerts((currentAlerts) => {
              const alreadyExists = currentAlerts.some(
                (alert) => alert.id === payload.new.id
              );

              if (alreadyExists) {
                return currentAlerts;
              }

              return [payload.new, ...currentAlerts];
            });
          }
        }
      )

      // PANIC ALERT UPDATED
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          console.log("🔄 PANIC ALERT UPDATED:", payload.new);

          if (payload.new.status === "ACTIVE") {
            setAlerts((currentAlerts) =>
              currentAlerts.map((alert) =>
                alert.id === payload.new.id ? payload.new : alert
              )
            );
          } else {
            setAlerts((currentAlerts) =>
              currentAlerts.filter(
                (alert) => alert.id !== payload.new.id
              )
            );
          }
        }
      )

      // ALERT DELETED
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "panic_alerts",
        },
        (payload) => {
          setAlerts((currentAlerts) =>
            currentAlerts.filter(
              (alert) => alert.id !== payload.old.id
            )
          );
        }
      )

      .subscribe((status) => {
        console.log("Panic alert realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------------------------------------------------------
  // ACKNOWLEDGE ALERT
  // ---------------------------------------------------------
  const acknowledgeAlert = async (id) => {
    try {
      setProcessingId(id);

      const { error } = await supabase
        .from("panic_alerts")
        .update({
          status: "ACKNOWLEDGED",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to acknowledge panic alert:", error);
        return;
      }

      setAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert.id !== id)
      );
    } catch (error) {
      console.error("Acknowledge error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // ---------------------------------------------------------
  // RESOLVE ALERT
  // ---------------------------------------------------------
  const resolveAlert = async (id) => {
    try {
      setProcessingId(id);

      const { error } = await supabase
        .from("panic_alerts")
        .update({
          status: "RESOLVED",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to resolve panic alert:", error);
        return;
      }

      setAlerts((currentAlerts) =>
        currentAlerts.filter((alert) => alert.id !== id)
      );
    } catch (error) {
      console.error("Resolve error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // ---------------------------------------------------------
  // OPEN LOCATION
  // ---------------------------------------------------------
  const openLocation = (alert) => {
    if (
      alert.latitude === null ||
      alert.latitude === undefined ||
      alert.longitude === null ||
      alert.longitude === undefined
    ) {
      return;
    }

    const url =
      `https://www.google.com/maps/search/?api=1&query=` +
      `${alert.latitude},${alert.longitude}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // ---------------------------------------------------------
  // TIME FORMAT
  // ---------------------------------------------------------
  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "Unknown";
    }

    return new Date(timestamp).toLocaleString();
  };

  // ---------------------------------------------------------
  // NOTHING ACTIVE
  // ---------------------------------------------------------
  if (!loading && alerts.length === 0) {
    return null;
  }

  // ---------------------------------------------------------
  // DISPLAY ALERTS
  // ---------------------------------------------------------
  return (
    <div className="panic-alert-container">
      {alerts.map((alert) => (
        <div
          className="panic-alert-card"
          key={alert.id}
        >
          <div className="panic-alert-header">
            <div className="panic-alert-title">
              <div className="panic-alert-icon">
                <AlertTriangle size={28} />
              </div>

              <div>
                <h2>PANIC ALERT</h2>
                <span>IMMEDIATE ATTENTION REQUIRED</span>
              </div>
            </div>

            <div className="panic-live-indicator">
              <span className="panic-live-dot"></span>
              ACTIVE
            </div>
          </div>

          <div className="panic-alert-body">

            <div className="panic-information">

              <div className="panic-info-item">
                <User size={20} />
                <div>
                  <small>DRIVER</small>
                  <strong>
                    {alert.driver_name || "Unknown Driver"}
                  </strong>
                </div>
              </div>

              <div className="panic-info-item">
                <Car size={20} />
                <div>
                  <small>VEHICLE</small>
                  <strong>
                    {alert.vehicle_name || "Unknown Vehicle"}
                  </strong>
                </div>
              </div>

              <div className="panic-info-item">
                <Clock size={20} />
                <div>
                  <small>TRIGGERED</small>
                  <strong>
                    {formatTime(alert.triggered_at)}
                  </strong>
                </div>
              </div>

            </div>

            <div className="panic-message">
              <AlertTriangle size={18} />

              <span>
                {alert.message ||
                  "Driver has triggered the panic button."}
              </span>
            </div>

            <div className="panic-actions">

              <button
                className="panic-location-button"
                onClick={() => openLocation(alert)}
                disabled={
                  alert.latitude === null ||
                  alert.longitude === null
                }
              >
                <MapPin size={18} />
                VIEW LOCATION
              </button>

              <button
                className="panic-acknowledge-button"
                onClick={() => acknowledgeAlert(alert.id)}
                disabled={processingId === alert.id}
              >
                <CheckCircle size={18} />

                {processingId === alert.id
                  ? "PROCESSING..."
                  : "ACKNOWLEDGE"}
              </button>

              <button
                className="panic-resolve-button"
                onClick={() => resolveAlert(alert.id)}
                disabled={processingId === alert.id}
              >
                <X size={18} />
                RESOLVE
              </button>

            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PanicAlert;