import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { Room, RoomEvent } from "livekit-client";

import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const CALL_SERVER_URL = "http://192.168.137.1:5001";

export default function IncomingCallManager() {
  const { user, loading } = useAuth();

  const [incomingCall, setIncomingCall] = useState(null);
  const [driverId, setDriverId] = useState(null);

  const [callStatus, setCallStatus] = useState("idle");
  const [error, setError] = useState("");

  const [room, setRoom] = useState(null);

  useEffect(() => {
    if (loading || !user?.id) {
      console.log(
        "📞 CALL MANAGER: waiting for authentication..."
      );
      return;
    }

    let mounted = true;
    let channel = null;

    const setupCallListener = async () => {
      try {
        console.log("");
        console.log("=================================");
        console.log("📞 CALL MANAGER STARTING");
        console.log("=================================");

        console.log(
          "👤 Authenticated user:",
          user.id
        );

        // =================================
        // FIND DRIVER
        // =================================

        const { data: driver, error: driverError } =
          await supabase
            .from("drivers")
            .select(
              "driver_id, driver_username, phone"
            )
            .eq("driver_id", user.id)
            .maybeSingle();

        if (driverError) {
          console.error(
            "❌ CALL MANAGER: driver lookup failed:",
            driverError
          );
          return;
        }

        if (!driver) {
          console.error(
            "❌ CALL MANAGER: no driver found for user:",
            user.id
          );
          return;
        }

        if (!mounted) {
          return;
        }

        setDriverId(driver.driver_id);

        console.log("✅ DRIVER FOUND");
        console.log(
          "Driver ID:",
          driver.driver_id
        );

        console.log(
          "Driver username:",
          driver.driver_username
        );

        // =================================
        // CREATE DRIVER CHANNEL
        // =================================

        const channelName =
          `driver-call-${driver.driver_id}`;

        console.log(
          "📡 Channel:",
          channelName
        );

        channel = supabase.channel(
          channelName,
          {
            config: {
              broadcast: {
                self: false,
              },
            },
          }
        );

        // =================================
        // LISTEN FOR INCOMING CALL
        // =================================

        channel.on(
          "broadcast",
          {
            event: "incoming_call",
          },
          (message) => {
            console.log("");
            console.log(
              "================================="
            );

            console.log(
              "📞📞📞 INCOMING CALL RECEIVED"
            );

            console.log(
              "================================="
            );

            console.log(
              "Full message:",
              message
            );

            const call =
              message?.payload;

            console.log(
              "Call payload:",
              call
            );

            if (!call?.roomName) {
              console.error(
                "❌ Incoming call has no roomName"
              );

              return;
            }

            if (!mounted) {
              return;
            }

            console.log(
              "🏠 Room:",
              call.roomName
            );

            console.log(
              "👤 Caller:",
              call.callerName
            );

            setError("");
            setCallStatus("ringing");

            setIncomingCall(call);
          }
        );

        // =================================
        // SUBSCRIBE
        // =================================

        console.log(
          "📡 CALL MANAGER: subscribing..."
        );

        channel.subscribe(
          (status, error) => {
            console.log(
              "📡 CALL CHANNEL STATUS:",
              status
            );

            if (error) {
              console.error(
                "❌ CALL CHANNEL ERROR:",
                error
              );
            }

            if (status === "SUBSCRIBED") {
              console.log("");
              console.log(
                "================================="
              );

              console.log(
                "✅ CALL MANAGER READY"
              );

              console.log(
                "📞 Listening for incoming calls"
              );

              console.log(
                "📡 Channel:",
                channelName
              );

              console.log(
                "================================="
              );
            }

            if (status === "CHANNEL_ERROR") {
              console.error(
                "❌ SUPABASE CHANNEL ERROR"
              );
            }

            if (status === "TIMED_OUT") {
              console.error(
                "❌ SUPABASE CHANNEL TIMED OUT"
              );
            }

            if (status === "CLOSED") {
              console.warn(
                "⚠️ SUPABASE CHANNEL CLOSED"
              );
            }
          }
        );
      } catch (error) {
        console.error(
          "❌ CALL MANAGER ERROR:",
          error
        );
      }
    };

    setupCallListener();

    // =================================
    // CLEANUP
    // =================================

    return () => {
      mounted = false;

      console.log(
        "🧹 CALL MANAGER CLEANUP"
      );

      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [user?.id, loading]);

  // =================================
  // DECLINE CALL
  // =================================

  const declineCall = () => {
    console.log(
      "📞 CALL DECLINED"
    );

    setIncomingCall(null);
    setCallStatus("idle");
    setError("");
  };

  // =================================
  // ACCEPT CALL
  // =================================

  const acceptCall = async () => {
    if (!incomingCall?.roomName) {
      console.error(
        "❌ Cannot accept call: no room name"
      );

      return;
    }

    try {
      setError("");
      setCallStatus("connecting");

      console.log("");
      console.log(
        "================================="
      );

      console.log(
        "📞 ACCEPTING LIVEKIT CALL"
      );

      console.log(
        "================================="
      );

      console.log(
        "🏠 Room:",
        incomingCall.roomName
      );

      console.log(
        "👤 Driver ID:",
        driverId
      );

      console.log(
        "🌐 Token server:",
        CALL_SERVER_URL
      );

      // =================================
      // DRIVER IDENTITY
      // =================================

      const participantIdentity =
        `driver-${driverId}`;

      console.log(
        "👤 Driver identity:",
        participantIdentity
      );

      // =================================
      // REQUEST DRIVER TOKEN
      // =================================

      console.log(
        "📡 Requesting driver LiveKit token..."
      );

      const response =
        await fetch(
          `${CALL_SERVER_URL}/api/livekit/token`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              roomName:
                incomingCall.roomName,

              participantIdentity,

              participantName:
                incomingCall.callerName ||
                "RiskRoute Driver",
            }),
          }
        );

      console.log(
        "📡 Token server HTTP status:",
        response.status
      );

      const data =
        await response.json();

      console.log(
        "📡 DRIVER TOKEN RESPONSE:",
        {
          success: data.success,
          serverUrl: data.serverUrl,
          tokenExists:
            !!data.participantToken,
          tokenLength:
            data.participantToken?.length,
          roomName:
            data.roomName,
          participantIdentity:
            data.participantIdentity,
        }
      );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to obtain LiveKit driver token."
        );
      }

      if (!data.success) {
        throw new Error(
          data.error ||
            "LiveKit token request failed."
        );
      }

      if (!data.participantToken) {
        throw new Error(
          "No LiveKit token was returned."
        );
      }

      if (!data.serverUrl) {
        throw new Error(
          "No LiveKit server URL was returned."
        );
      }

      // =================================
      // CREATE LIVEKIT ROOM
      // =================================

      console.log(
        "🏠 Creating LiveKit Room..."
      );

      const newRoom =
        new Room({
          adaptiveStream: true,
          dynacast: true,
        });

      // =================================
      // LIVEKIT EVENTS
      // =================================

      newRoom.on(
        RoomEvent.Connected,
        () => {
          console.log("");
          console.log(
            "================================="
          );

          console.log(
            "✅ DRIVER CONNECTED TO LIVEKIT"
          );

          console.log(
            "================================="
          );

          console.log(
            "🏠 Room:",
            incomingCall.roomName
          );

          setCallStatus("active");
        }
      );

      newRoom.on(
        RoomEvent.Disconnected,
        (reason) => {
          console.log(
            "📞 DRIVER DISCONNECTED FROM LIVEKIT:",
            reason
          );

          setCallStatus("idle");
          setRoom(null);
          setIncomingCall(null);
        }
      );

      newRoom.on(
        RoomEvent.ParticipantConnected,
        (participant) => {
          console.log(
            "👤 PARTICIPANT CONNECTED:",
            participant.identity
          );
        }
      );

      newRoom.on(
        RoomEvent.ParticipantDisconnected,
        (participant) => {
          console.log(
            "👤 PARTICIPANT DISCONNECTED:",
            participant.identity
          );
        }
      );

      newRoom.on(
        RoomEvent.TrackSubscribed,
        (
          track,
          publication,
          participant
        ) => {
          console.log(
            "🎧 AUDIO TRACK RECEIVED FROM:",
            participant.identity
          );

          if (
            track.kind === "audio"
          ) {
            console.log(
              "🔊 Remote audio track available"
            );
          }
        }
      );

      // =================================
      // CONNECT TO LIVEKIT
      // =================================

      console.log(
        "🔌 Connecting to LiveKit..."
      );

      await newRoom.connect(
        data.serverUrl,
        data.participantToken
      );

      console.log(
        "✅ LiveKit connection established"
      );

      // =================================
      // ENABLE MICROPHONE
      // =================================

      console.log(
        "🎤 Enabling microphone..."
      );

      await newRoom.localParticipant.setMicrophoneEnabled(
        true
      );

      console.log(
        "🎤 Driver microphone enabled"
      );

      if (!mounted) {
        await newRoom.disconnect();
        return;
      }

      setRoom(newRoom);
      setIncomingCall(null);

      console.log(
        "================================="
      );

      console.log(
        "📞 DRIVER IS NOW IN CALL"
      );

      console.log(
        "================================="
      );
    } catch (callError) {
      console.error("");
      console.error(
        "================================="
      );

      console.error(
        "❌ DRIVER LIVEKIT CALL FAILED"
      );

      console.error(
        "================================="
      );

      console.error(
        callError
      );

      console.error(
        "Message:",
        callError?.message
      );

      setError(
        callError?.message ||
          "Unable to connect to the call."
      );

      setCallStatus("ringing");
    }
  };

  // =================================
  // END CALL
  // =================================

  const endCall = async () => {
    console.log(
      "📞 DRIVER ENDING CALL"
    );

    try {
      if (room) {
        await room.disconnect();
      }
    } catch (error) {
      console.error(
        "❌ Error disconnecting LiveKit:",
        error
      );
    }

    setRoom(null);
    setIncomingCall(null);
    setCallStatus("idle");
    setError("");
  };

  // =================================
  // ACTIVE CALL UI
  // =================================

  if (
    callStatus === "active" &&
    room
  ) {
    return (
      <View style={styles.overlay}>
        <View style={styles.callCard}>
          <Text style={styles.title}>
            Call Connected
          </Text>

          <Text style={styles.caller}>
            {incomingCall?.callerName ||
              "RiskRoute Administrator"}
          </Text>

          <Text style={styles.subtitle}>
            You are now connected
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              styles.declineButton,
            ]}
            onPress={endCall}
          >
            <Text style={styles.buttonText}>
              End Call
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // =================================
  // NOTHING TO DISPLAY
  // =================================

  if (!incomingCall) {
    return null;
  }

  // =================================
  // INCOMING CALL UI
  // =================================

  return (
    <View style={styles.overlay}>
      <View style={styles.callCard}>
        <Text style={styles.title}>
          Incoming Call
        </Text>

        <Text style={styles.caller}>
          {incomingCall.callerName ||
            "RiskRoute Administrator"}
        </Text>

        <Text style={styles.subtitle}>
          {callStatus === "connecting"
            ? "Connecting..."
            : "Driver assistance call"}
        </Text>

        {error ? (
          <Text style={styles.error}>
            {error}
          </Text>
        ) : null}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.declineButton,
            ]}
            onPress={declineCall}
            disabled={
              callStatus === "connecting"
            }
          >
            <Text style={styles.buttonText}>
              Decline
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.acceptButton,
            ]}
            onPress={acceptCall}
            disabled={
              callStatus === "connecting"
            }
          >
            <Text style={styles.buttonText}>
              {callStatus === "connecting"
                ? "Connecting..."
                : "Accept"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// =================================
// STYLES
// =================================

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor:
      "rgba(0,0,0,0.55)",

    justifyContent: "center",
    alignItems: "center",

    zIndex: 9999,
  },

  callCard: {
    width: "85%",

    backgroundColor: "#ffffff",

    borderRadius: 20,

    padding: 28,

    alignItems: "center",

    elevation: 10,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",

    marginBottom: 12,
  },

  caller: {
    fontSize: 20,
    fontWeight: "600",

    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    color: "#666666",

    marginBottom: 20,
  },

  error: {
    color: "#d32f2f",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 15,
  },

  buttons: {
    flexDirection: "row",
    gap: 15,
  },

  button: {
    minWidth: 110,

    paddingVertical: 14,
    paddingHorizontal: 20,

    borderRadius: 12,

    alignItems: "center",
  },

  declineButton: {
    backgroundColor: "#d32f2f",
  },

  acceptButton: {
    backgroundColor: "#2e7d32",
  },

  buttonText: {
    color: "#ffffff",

    fontSize: 16,

    fontWeight: "700",
  },
});