
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Only POST requests are allowed"
    });
  }

  const { prompt, ratio } = req.body || {};

  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: "Video prompt is required"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Backend is working!",
    prompt: prompt,
    ratio: ratio || "16:9"
  });
}
