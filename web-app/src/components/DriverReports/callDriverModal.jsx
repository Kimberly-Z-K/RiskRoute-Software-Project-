import React, { useEffect, useRef, useState } from "react";

import {
  MapPin,
  Phone,
  Truck,
  User,
  X,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";

import {
  Room,
  RoomEvent,
  Track,
} from "livekit-client";

import { supabase } from "../../../lib/supabase";

// =========================================================
// CONFIGURATION
// =========================================================

const CALL_SERVER_URL = "http://127.0.0.1:5001";

// =========================================================
// ACTIVE LIVEKIT CALL
// =========================================================

const ActiveCall = ({
  token,
  serverUrl,
  driverName,
  onEnd,
}) => {
  const roomRef = useRef(null);
  const audioElementsRef = useRef([]);

  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connectionError, setConnectionError] = useState("");

  // =======================================================
  // CONNECT TO LIVEKIT
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const connectToLiveKit = async () => {
      try {
        console.log("");
        console.log("=================================");
        console.log("🎙️ DIRECT LIVEKIT CONNECTION");
        console.log("=================================");

        console.log("🌐 Server URL:", serverUrl);
        console.log("🔑 Token exists:", !!token);
        console.log("🔑 Token length:", token?.length || 0);

        if (!token) {
          throw new Error("LiveKit token is missing.");
        }

        if (!serverUrl) {
          throw new Error(
            "LiveKit server URL is missing."
          );
        }

        if (
          !serverUrl.startsWith("wss://") &&
          !serverUrl.startsWith("ws://")
        ) {
          throw new Error(
            `Invalid LiveKit URL: ${serverUrl}`
          );
        }

        // -------------------------------------------------
        // CREATE ROOM
        // -------------------------------------------------

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        roomRef.current = room;

        // -------------------------------------------------
        // ROOM CONNECTED
        // -------------------------------------------------

        room.on(
          RoomEvent.Connected,
          () => {
            console.log(
              "================================="
            );

            console.log(
              "✅ CONNECTED TO LIVEKIT"
            );

            console.log(
              "================================="
            );

            console.log(
              "🏠 Room:",
              room.name
            );

            console.log(
              "👤 Local participant:",
              room.localParticipant.identity
            );

            if (mounted) {
              setConnected(true);
              setConnectionError("");
            }
          }
        );

        // -------------------------------------------------
        // DISCONNECTED
        // -------------------------------------------------

        room.on(
          RoomEvent.Disconnected,
          (reason) => {
            console.log(
              "📴 DISCONNECTED FROM LIVEKIT"
            );

            console.log(
              "Reason:",
              reason
            );

            if (mounted) {
              setConnected(false);
            }
          }
        );

        // -------------------------------------------------
        // REMOTE TRACK SUBSCRIBED
        // -------------------------------------------------

        room.on(
          RoomEvent.TrackSubscribed,
          (
            track,
            publication,
            participant
          ) => {
            console.log(
              "🎧 REMOTE TRACK SUBSCRIBED"
            );

            console.log(
              "Participant:",
              participant.identity
            );

            console.log(
              "Track kind:",
              track.kind
            );

            if (
              track.kind ===
              Track.Kind.Audio
            ) {
              const audioElement =
                track.attach();

              audioElement.autoplay = true;

              audioElement.setAttribute(
                "playsinline",
                "true"
              );

              document.body.appendChild(
                audioElement
              );

              audioElementsRef.current.push(
                audioElement
              );

              console.log(
                "🔊 Remote audio attached"
              );

              // Browser may require user interaction.
              audioElement
                .play()
                .catch((error) => {
                  console.warn(
                    "⚠️ Browser blocked autoplay:",
                    error
                  );
                });
            }
          }
        );

        // -------------------------------------------------
        // REMOTE TRACK UNSUBSCRIBED
        // -------------------------------------------------

        room.on(
          RoomEvent.TrackUnsubscribed,
          (track) => {
            console.log(
              "🔇 REMOTE TRACK UNSUBSCRIBED"
            );

            track.detach();
          }
        );

        // -------------------------------------------------
        // PARTICIPANT CONNECTED
        // -------------------------------------------------

        room.on(
          RoomEvent.ParticipantConnected,
          (participant) => {
            console.log(
              "👤 PARTICIPANT CONNECTED:",
              participant.identity
            );
          }
        );

        // -------------------------------------------------
        // PARTICIPANT DISCONNECTED
        // -------------------------------------------------

        room.on(
          RoomEvent.ParticipantDisconnected,
          (participant) => {
            console.log(
              "👤 PARTICIPANT DISCONNECTED:",
              participant.identity
            );
          }
        );

        // -------------------------------------------------
        // CONNECT
        // -------------------------------------------------

        console.log(
          "🔌 Calling room.connect()..."
        );

        await room.connect(
          serverUrl,
          token,
          {
            autoSubscribe: true,
            maxRetries: 1,
            websocketTimeout: 15000,
          }
        );

        console.log(
          "✅ room.connect() completed"
        );

        // -------------------------------------------------
        // ENABLE MICROPHONE
        // -------------------------------------------------

        console.log(
          "🎙️ Enabling microphone..."
        );

        await room.localParticipant.setMicrophoneEnabled(
          true
        );

        console.log(
          "🎙️ Microphone enabled"
        );

      } catch (error) {
        console.error("");
        console.error(
          "================================="
        );
        console.error(
          "❌ LIVEKIT CONNECTION FAILED"
        );
        console.error(
          "================================="
        );

        console.error(
          "Name:",
          error?.name
        );

        console.error(
          "Message:",
          error?.message
        );

        console.error(
          "Reason:",
          error?.reason
        );

        console.error(
          "Code:",
          error?.code
        );

        console.error(
          "Status:",
          error?.status
        );

        console.error(
          "Full error:",
          error
        );

        console.error(
          "================================="
        );

        if (mounted) {
          setConnectionError(
            error?.message ||
              "Could not connect to LiveKit."
          );

          setConnected(false);
        }
      }
    };

    connectToLiveKit();

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      mounted = false;

      console.log(
        "🧹 Cleaning up LiveKit room..."
      );

      audioElementsRef.current.forEach(
        (element) => {
          try {
            element.pause();
            element.remove();
          } catch (error) {
            console.warn(
              "Audio cleanup error:",
              error
            );
          }
        }
      );

      audioElementsRef.current = [];

      if (roomRef.current) {
        roomRef.current.disconnect();

        roomRef.current = null;
      }
    };
  }, [token, serverUrl]);

  // =======================================================
  // MUTE / UNMUTE
  // =======================================================

  const toggleMute = async () => {
    try {
      const room = roomRef.current;

      if (!room) {
        return;
      }

      const newMutedState = !muted;

      await room.localParticipant.setMicrophoneEnabled(
        !newMutedState
      );

      setMuted(newMutedState);

      console.log(
        newMutedState
          ? "🎙️ Microphone muted"
          : "🎙️ Microphone unmuted"
      );

    } catch (error) {
      console.error(
        "❌ Failed to toggle microphone:",
        error
      );
    }
  };

  // =======================================================
  // END CALL
  // =======================================================

  const handleEndCall = async () => {
    try {
      console.log(
        "📴 Ending LiveKit call..."
      );

      if (roomRef.current) {
        await roomRef.current.disconnect();
      }

    } catch (error) {
      console.error(
        "❌ Error ending call:",
        error
      );
    } finally {
      onEnd?.();
    }
  };

  // =======================================================
  // UI
  // =======================================================

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* HEADER */}

        <div className="bg-green-600 px-6 py-5 text-white">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm opacity-80">
                RiskRoute Voice Call
              </p>

              <h2 className="text-xl font-bold mt-1">
                {driverName}
              </h2>

            </div>

            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">

              <Phone className="w-6 h-6" />

            </div>

          </div>

        </div>

        {/* CONTENT */}

        <div className="p-8 text-center">

          <div className="w-24 h-24 mx-auto rounded-full bg-green-50 flex items-center justify-center mb-5">

            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">

              <Phone className="w-8 h-8 text-green-600" />

            </div>

          </div>

          <h3 className="text-lg font-bold text-slate-900">

            {connected
              ? "Connected"
              : "Connecting..."}

          </h3>

          <p className="text-sm text-slate-500 mt-2">

            {connected
              ? `You are speaking with ${driverName}`
              : "Connecting to the driver..."}

          </p>

          {/* ERROR */}

          {connectionError && (

            <div className="mt-5 p-4 rounded-lg bg-red-50 border border-red-200 text-left">

              <p className="text-xs font-semibold text-red-700 mb-1">
                LiveKit connection error
              </p>

              <p className="text-sm text-red-600 break-words">
                {connectionError}
              </p>

            </div>

          )}

          {/* CONTROLS */}

          <div className="flex items-center justify-center gap-4 mt-8">

            {/* MUTE */}

            <button
              onClick={toggleMute}
              disabled={!connected}
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                muted
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700"
              } disabled:opacity-50`}
              title={
                muted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
            >

              {muted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}

            </button>

            {/* END CALL */}

            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
              title="End call"
            >

              <PhoneOff className="w-5 h-5" />

            </button>

          </div>

          {!connected && !connectionError && (

            <p className="text-xs text-slate-400 mt-6">
              Establishing secure voice connection...
            </p>

          )}

        </div>

      </div>

    </div>
  );
};

// =========================================================
// CALL DRIVER MODAL
// =========================================================

const CallDriverModal = ({
  driver,
  onClose,
}) => {
  const [callState, setCallState] =
    useState("idle");

  const [callToken, setCallToken] =
    useState(null);

  const [callServerUrl, setCallServerUrl] =
    useState(null);

  const [callRoom, setCallRoom] =
    useState(null);

  const [error, setError] =
    useState("");

  // =======================================================
  // DRIVER DATA
  // =======================================================

  const driverName =
    driver?.driver ||
    driver?.driver_username ||
    "Unknown Driver";

  const driverPhone =
    driver?.phone || "";

  const driverTitle =
    driver?.title ||
    "Driver Report";

  const driverTruck =
    driver?.truck ||
    "Vehicle unavailable";

  const driverLocation =
    driver?.location ||
    "Location unavailable";

  const driverMessage =
    driver?.message ||
    "No additional details provided.";

  // =======================================================
  // RESET
  // =======================================================

  useEffect(() => {
    setCallState("idle");
    setCallToken(null);
    setCallServerUrl(null);
    setCallRoom(null);
    setError("");
  }, [driver]);

  // =======================================================
  // START CALL
  // =======================================================
const handleCall = async () => {
  let callChannel = null;

  try {
    if (!driver?.driver_id) {
      setError(
        "This driver does not have a valid driver ID."
      );

      return;
    }

    setError("");
    setCallState("connecting");

    // ---------------------------------------------------
    // UNIQUE ROOM
    // ---------------------------------------------------

    const roomName =
      `riskroute-call-${driver.driver_id}-${Date.now()}`;

    const participantIdentity =
      `admin-${Date.now()}`;

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "📞 STARTING RISKROUTE CALL"
    );
    console.log(
      "================================="
    );

    console.log(
      "👤 Driver ID:",
      driver.driver_id
    );

    console.log(
      "👤 Driver:",
      driverName
    );

    console.log(
      "🏠 Room:",
      roomName
    );

    console.log(
      "👨‍💼 Admin identity:",
      participantIdentity
    );

    console.log(
      "🌐 Token server:",
      CALL_SERVER_URL
    );

    // ---------------------------------------------------
    // REQUEST LIVEKIT TOKEN
    // ---------------------------------------------------

    console.log(
      "📡 Requesting LiveKit token..."
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
            roomName,

            participantIdentity,

            participantName:
              "RiskRoute Administrator",
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
      "LIVEKIT TOKEN RESPONSE:",
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

    console.log(
      "🔥 LIVEKIT RESPONSE:",
      {
        success:
          data.success,

        serverUrl:
          data.serverUrl,

        hasToken:
          !!data.participantToken,

        tokenLength:
          data.participantToken?.length,

        tokenStart:
          data.participantToken?.substring(
            0,
            20
          ),
      }
    );

    // ---------------------------------------------------
    // VALIDATE RESPONSE
    // ---------------------------------------------------

    if (!response.ok) {
      throw new Error(
        data.error ||
          "Failed to create call token."
      );
    }

    if (!data.success) {
      throw new Error(
        data.error ||
          "Call server returned an unsuccessful response."
      );
    }

    if (!data.participantToken) {
      throw new Error(
        "Call server did not return a LiveKit token."
      );
    }

    if (!data.serverUrl) {
      throw new Error(
        "Call server did not return the LiveKit server URL."
      );
    }

    // ---------------------------------------------------
    // VALIDATE LIVEKIT URL
    // ---------------------------------------------------

    if (
      !data.serverUrl.startsWith(
        "wss://"
      ) &&
      !data.serverUrl.startsWith(
        "ws://"
      )
    ) {
      throw new Error(
        `Invalid LiveKit server URL: ${data.serverUrl}`
      );
    }

    // ===================================================
    // SEND INCOMING CALL TO DRIVER
    // ===================================================

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "📡 SENDING INCOMING CALL"
    );
    console.log(
      "================================="
    );

    const channelName =
      `driver-call-${driver.driver_id}`;

    console.log(
      "📡 Channel:",
      channelName
    );

    console.log(
      "👤 Driver ID:",
      driver.driver_id
    );

    console.log(
      "🏠 Room:",
      roomName
    );

    // ---------------------------------------------------
    // CREATE SUPABASE REALTIME CHANNEL
    // ---------------------------------------------------

    callChannel =
      supabase.channel(
        channelName,
        {
          config: {
            broadcast: {
              self: false,
            },
          },
        }
      );

    // ---------------------------------------------------
    // WAIT FOR CHANNEL TO SUBSCRIBE
    // ---------------------------------------------------

    await new Promise(
      (resolve, reject) => {
        callChannel.subscribe(
          (status, channelError) => {
            console.log(
              "📡 ADMIN CALL CHANNEL STATUS:",
              status
            );

            if (channelError) {
              console.error(
                "❌ ADMIN CALL CHANNEL ERROR:",
                channelError
              );
            }

            if (
              status ===
              "SUBSCRIBED"
            ) {
              console.log(
                "✅ ADMIN CALL CHANNEL SUBSCRIBED"
              );

              resolve();
            }

            if (
              status ===
              "CHANNEL_ERROR"
            ) {
              reject(
                new Error(
                  "Could not connect to the Supabase call channel."
                )
              );
            }

            if (
              status ===
              "TIMED_OUT"
            ) {
              reject(
                new Error(
                  "Supabase call channel timed out."
                )
              );
            }
          }
        );
      }
    );

    // ---------------------------------------------------
    // SEND BROADCAST
    // ---------------------------------------------------

    console.log(
      "📡 Broadcasting incoming call..."
    );

    const broadcastResult =
      await callChannel.send({
        type: "broadcast",

        event:
          "incoming_call",

        payload: {
          roomName,

          driverId:
            driver.driver_id,

          callerName:
            "RiskRoute Administrator",

          callerIdentity:
            participantIdentity,

          reportId:
            driver?.id ||
            driver?.report_id ||
            null,
        },
      });

    console.log(
      "📡 BROADCAST RESULT:",
      broadcastResult
    );

    if (
      broadcastResult !==
      "ok"
    ) {
      throw new Error(
        "Supabase failed to send the incoming call notification."
      );
    }

    console.log(
      "================================="
    );

    console.log(
      "✅ INCOMING CALL SENT TO DRIVER"
    );

    console.log(
      "================================="
    );

    console.log(
      "📱 Waiting for driver to accept..."
    );

    console.log(
      "🏠 Room:",
      roomName
    );

    // ---------------------------------------------------
    // REMOVE TEMPORARY BROADCAST CHANNEL
    // ---------------------------------------------------

    await supabase.removeChannel(
      callChannel
    );

    callChannel = null;

    // ---------------------------------------------------
    // SAVE LIVEKIT CALL DETAILS
    // ---------------------------------------------------

    setCallToken(
      data.participantToken
    );

    setCallServerUrl(
      data.serverUrl
    );

    setCallRoom(
      roomName
    );

    setCallState("active");

    console.log(
      "================================="
    );

    console.log(
      "✅ LIVEKIT CALL READY"
    );

    console.log(
      "================================="
    );

    console.log(
      "🏠 Room:",
      roomName
    );

    console.log(
      "🌐 LiveKit URL:",
      data.serverUrl
    );

    console.log(
      "🔑 Token length:",
      data.participantToken.length
    );

  } catch (callError) {

    // ---------------------------------------------------
    // CLEANUP CHANNEL IF SOMETHING FAILED
    // ---------------------------------------------------

    if (callChannel) {
      try {
        await supabase.removeChannel(
          callChannel
        );
      } catch (cleanupError) {
        console.warn(
          "⚠️ Failed to clean up call channel:",
          cleanupError
        );
      }
    }

    console.error(
      "================================="
    );

    console.error(
      "❌ FAILED TO START CALL"
    );

    console.error(
      callError
    );

    console.error(
      "================================="
    );

    setError(
      callError?.message ||
        "Unable to start call."
    );

    setCallState("idle");
  }
};

  // =======================================================
  // END CALL
  // =======================================================

  const handleEndCall = () => {
    console.log(
      "📴 ENDING CALL:",
      callRoom
    );

    setCallToken(null);
    setCallServerUrl(null);
    setCallRoom(null);
    setCallState("idle");
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    handleEndCall();

    onClose?.();
  };

  // =======================================================
  // NO DRIVER
  // =======================================================

  if (!driver) {
    return null;
  }

  // =======================================================
  // ACTIVE CALL
  // =======================================================

  if (
    callState === "active" &&
    callToken &&
    callServerUrl
  ) {
    return (
      <ActiveCall
        token={callToken}
        serverUrl={callServerUrl}
        driverName={driverName}
        onEnd={handleClose}
      />
    );
  }

  // =======================================================
  // CALL MODAL
  // =======================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* HEADER */}

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">

          <div>

            <h2 className="text-lg font-bold text-slate-900">
              Call Driver
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Start a live voice call with the driver
            </p>

          </div>

          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

        {/* DRIVER */}

        <div className="p-6">

          <div className="flex items-center gap-4 mb-5">

            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">

              <User className="w-6 h-6 text-blue-600" />

            </div>

            <div>

              <h3 className="font-bold text-slate-900">
                {driverName}
              </h3>

              <p className="text-sm text-slate-500">
                {driverPhone ||
                  "No phone number available"}
              </p>

            </div>

          </div>

          {/* REPORT */}

          <div className="space-y-3 mb-6">

            <div className="flex items-start gap-3">

              <Truck className="w-5 h-5 text-slate-400 mt-0.5" />

              <div>

                <p className="text-xs text-slate-400 uppercase font-semibold">
                  Vehicle
                </p>

                <p className="text-sm font-medium text-slate-800">
                  {driverTruck}
                </p>

              </div>

            </div>

            <div className="flex items-start gap-3">

              <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />

              <div>

                <p className="text-xs text-slate-400 uppercase font-semibold">
                  Location
                </p>

                <p className="text-sm font-medium text-slate-800">
                  {driverLocation}
                </p>

              </div>

            </div>

          </div>

          {/* MESSAGE */}

          <div className="bg-slate-50 rounded-xl p-4 mb-6">

            <p className="text-xs text-slate-400 uppercase font-semibold mb-1">
              Report
            </p>

            <p className="text-sm font-semibold text-slate-800 mb-1">
              {driverTitle}
            </p>

            <p className="text-sm text-slate-600">
              {driverMessage}
            </p>

          </div>

          {/* ERROR */}

          {error && (

            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">

              <p className="text-sm text-red-700 break-words">
                {error}
              </p>

            </div>

          )}

          {/* ACTIONS */}

          <div className="flex gap-3">

            <button
              onClick={handleClose}
              className="flex-1 h-11 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              onClick={handleCall}
              disabled={
                callState === "connecting" ||
                !driver?.driver_id
              }
              className="flex-1 h-11 rounded-lg bg-green-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >

              <Phone className="w-4 h-4" />

              {callState === "connecting"
                ? "Connecting..."
                : "Call Driver"}

            </button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default CallDriverModal;