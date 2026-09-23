const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { AccessToken, TokenVerifier } = require("livekit-server-sdk");

const app = express();

const PORT = process.env.PORT || 5001;

const LIVEKIT_URL = process.env.LIVEKIT_URL?.trim();
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY?.trim();
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET?.trim();

// =================================
// LIVEKIT CONFIGURATION
// =================================

console.log("===== LIVEKIT CONFIG =====");
console.log("URL:", LIVEKIT_URL);
console.log("API KEY:", LIVEKIT_API_KEY);
console.log("SECRET EXISTS:", !!LIVEKIT_API_SECRET);
console.log("SECRET LENGTH:", LIVEKIT_API_SECRET?.length);
console.log("==========================");

// =================================
// MIDDLEWARE
// =================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// =================================
// HEALTH CHECK
// =================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RiskRoute LiveKit Call Server is running",
    livekitUrl: LIVEKIT_URL,
  });
});

// =================================
// LIVEKIT TOKEN ENDPOINT
// =================================

app.post("/api/livekit/token", async (req, res) => {
  try {
    const {
      roomName,
      participantIdentity,
      participantName,
    } = req.body;

    console.log("");
    console.log("=================================");
    console.log("📞 LIVEKIT TOKEN REQUEST");
    console.log("=================================");

    console.log("🏠 Room:", roomName);
    console.log("👤 Identity:", participantIdentity);
    console.log("👤 Name:", participantName);

    console.log(
      "🔑 API KEY EXISTS:",
      !!LIVEKIT_API_KEY
    );

    console.log(
      "🔐 API SECRET EXISTS:",
      !!LIVEKIT_API_SECRET
    );

    console.log(
      "🌐 LIVEKIT URL:",
      LIVEKIT_URL
    );

    // =================================
    // VALIDATE REQUEST
    // =================================

    if (!roomName || !participantIdentity) {
      console.error(
        "❌ Missing roomName or participantIdentity"
      );

      return res.status(400).json({
        success: false,
        error:
          "roomName and participantIdentity are required",
      });
    }

    // =================================
    // VALIDATE LIVEKIT CONFIG
    // =================================

    if (
      !LIVEKIT_URL ||
      !LIVEKIT_API_KEY ||
      !LIVEKIT_API_SECRET
    ) {
      console.error(
        "❌ LiveKit configuration is missing"
      );

      return res.status(500).json({
        success: false,
        error:
          "LiveKit configuration is missing",
      });
    }

    // =================================
    // VALIDATE LIVEKIT URL
    // =================================

    if (
      !LIVEKIT_URL.startsWith("wss://") &&
      !LIVEKIT_URL.startsWith("ws://")
    ) {
      console.error(
        "❌ LIVEKIT_URL must start with wss:// or ws://"
      );

      return res.status(500).json({
        success: false,
        error:
          "LIVEKIT_URL must start with wss:// or ws://",
      });
    }

    // =================================
    // CREATE ACCESS TOKEN
    // =================================

    console.log(
      "🔐 Creating LiveKit AccessToken..."
    );

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: String(participantIdentity),
        name: String(
          participantName || participantIdentity
        ),
        ttl: "1h",
      }
    );

    // =================================
    // ADD LIVEKIT GRANTS
    // =================================

    token.addGrant({
      roomJoin: true,
      room: String(roomName),
      canPublish: true,
      canSubscribe: true,
    });

    console.log("✅ LiveKit grant added");

    // =================================
    // GENERATE JWT
    // =================================

    const participantToken =
      await token.toJwt();

    console.log("");
    console.log(
      "===== TOKEN GENERATED ====="
    );

    console.log(
      "API KEY:",
      LIVEKIT_API_KEY
    );

    console.log(
      "TOKEN EXISTS:",
      !!participantToken
    );

    console.log(
      "TOKEN LENGTH:",
      participantToken.length
    );

    console.log(
      "TOKEN START:",
      participantToken.substring(0, 30)
    );

    console.log(
      "==========================="
    );

    console.log("✅ JWT generated");
    console.log(
      "🔑 Token length:",
      participantToken.length
    );

    // =================================
    // DECODE JWT CLAIMS
    // =================================

    try {
      const parts =
        participantToken.split(".");

      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(
            parts[1],
            "base64url"
          ).toString("utf8")
        );

        console.log("");
        console.log(
          "🔎 TOKEN CLAIMS:"
        );

        console.log(
          "   iss:",
          payload.iss
        );

        console.log(
          "   sub:",
          payload.sub
        );

        console.log(
          "   exp:",
          payload.exp
        );

        console.log(
          "   nbf:",
          payload.nbf
        );

        console.log(
          "   room:",
          payload.video?.room
        );

        console.log(
          "   roomJoin:",
          payload.video?.roomJoin
        );

        console.log(
          "   canPublish:",
          payload.video?.canPublish
        );

        console.log(
          "   canSubscribe:",
          payload.video?.canSubscribe
        );

        // =================================
        // CHECK ISSUER
        // =================================

        if (
          payload.iss !== LIVEKIT_API_KEY
        ) {
          console.error(
            "❌ CRITICAL: TOKEN ISSUER DOES NOT MATCH API KEY"
          );
        } else {
          console.log(
            "✅ TOKEN ISSUER MATCHES API KEY"
          );
        }

        // =================================
        // CHECK IDENTITY
        // =================================

        if (
          payload.sub ===
          String(participantIdentity)
        ) {
          console.log(
            "✅ TOKEN IDENTITY MATCHES"
          );
        } else {
          console.error(
            "❌ TOKEN IDENTITY DOES NOT MATCH"
          );
        }

        // =================================
        // CHECK ROOM
        // =================================

        if (
          payload.video?.room ===
          String(roomName)
        ) {
          console.log(
            "✅ TOKEN ROOM MATCHES"
          );
        } else {
          console.error(
            "❌ TOKEN ROOM DOES NOT MATCH"
          );
        }
      }
    } catch (decodeError) {
      console.error(
        "❌ Could not decode JWT claims:",
        decodeError
      );
    }

    // =================================
    // VERIFY JWT SIGNATURE
    // =================================

    try {
      const verifier =
        new TokenVerifier(
          LIVEKIT_API_KEY,
          LIVEKIT_API_SECRET
        );

      const verified =
        await verifier.verify(
          participantToken
        );

      console.log("");
      console.log(
        "===== TOKEN VERIFICATION ====="
      );

      console.log(
        "✅ JWT SIGNATURE VERIFIED BY SERVER"
      );

      console.log(
        "Identity:",
        verified.identity
      );

      console.log(
        "Room:",
        verified.video?.room
      );

      console.log(
        "=============================="
      );
    } catch (verifyError) {
      console.error("");
      console.error(
        "❌ JWT VERIFICATION FAILED"
      );

      console.error(
        verifyError.message ||
          verifyError
      );

      console.error(
        "=============================="
      );

      return res.status(500).json({
        success: false,
        error:
          "Generated LiveKit token could not be verified",
      });
    }

    // =================================
    // TOKEN READY
    // =================================

    console.log("");
    console.log(
      "================================="
    );

    console.log(
      "✅ LIVEKIT TOKEN READY"
    );

    console.log(
      "================================="
    );

    console.log(
      "🏠 Room:",
      roomName
    );

    console.log(
      "👤 Identity:",
      participantIdentity
    );

    console.log(
      "🌐 LiveKit:",
      LIVEKIT_URL
    );

    console.log(
      "================================="
    );

    // =================================
    // SEND TOKEN TO FRONTEND
    // =================================

    return res.json({
      success: true,
      serverUrl: LIVEKIT_URL,
      participantToken,
      roomName,
      participantIdentity,
    });
  } catch (error) {
    console.error("");
    console.error(
      "❌ LIVEKIT TOKEN ERROR"
    );

    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        "Failed to generate LiveKit token",
    });
  }
});

// =================================
// START SERVER
// =================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log(
    "================================="
  );

  console.log(
    "🚀 RISКROUTE CALL SERVER"
  );

  console.log(
    "================================="
  );

  console.log(
    `✅ Port: ${PORT}`
  );

  console.log(
    `✅ Local URL: http://localhost:${PORT}`
  );

  console.log(
    `✅ Network URL: http://127.0.0.1:${PORT}`
  );

  console.log(
    "================================="
  );

  console.log(
    "🔑 API KEY:",
    LIVEKIT_API_KEY
      ? "LOADED"
      : "MISSING"
  );

  console.log(
    "🔐 API SECRET:",
    LIVEKIT_API_SECRET
      ? "LOADED"
      : "MISSING"
  );

  console.log(
    "🌐 LIVEKIT URL:",
    LIVEKIT_URL || "MISSING"
  );

  console.log(
    "================================="
  );
});