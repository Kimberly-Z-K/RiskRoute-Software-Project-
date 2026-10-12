
export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      status: "error",
      message: "Method not allowed"
    });
  }

  return res.status(200).json({
    status: "ok",
    service: "RiskRoute API",
    timestamp: new Date().toISOString()
  });
}
