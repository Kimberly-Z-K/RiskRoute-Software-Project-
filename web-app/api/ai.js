
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");

    return res.status(405).json({
      error: "Use POST for AI requests"
    });
  }

  const { input } = req.body || {};

  if (typeof input !== "string" || !input.trim()) {
    return res.status(400).json({
      error: "Please provide an input string"
    });
  }

  return res.status(200).json({
    success: true,
    message: "RiskRoute AI endpoint is working",
    receivedInput: input
  });
}
