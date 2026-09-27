const MODEL = "Wan-AI/Wan2.1-T2V-1.3B";

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return jsonResponse({
        success: true,
        message: "AI Video Generator API is running",
        provider: "Hugging Face"
      });
    }

    // Generate video
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        // Check Hugging Face token
        if (!env.HF_TOKEN) {
          return jsonResponse(
            {
              success: false,
              error: "HF_TOKEN is missing in Cloudflare Worker secrets"
            },
            500
          );
        }

        // Read request body
        const body = await request.json();

        const prompt = body.prompt;
        const ratio = body.ratio || "16:9";

        if (!prompt || typeof prompt !== "string") {
          return jsonResponse(
            {
              success: false,
              error: "Prompt is required"
            },
            400
          );
        }

        // Optional negative prompt
        const negativePrompt =
          body.negative_prompt ||
          "blurry, low quality, distorted, watermark, text, logo";

        // Hugging Face Inference API
        const hfResponse = await fetch(
          "https://router.huggingface.co/hf-inference/models/" + MODEL,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                negative_prompt: negativePrompt
              }
            })
          }
        );

        // Handle HF errors
        if (!hfResponse.ok) {
          const errorText = await hfResponse.text();

          return jsonResponse(
            {
              success: false,
              error: "Hugging Face request failed",
              status: hfResponse.status,
              details: errorText
            },
            hfResponse.status
          );
        }

        // HF returns generated video as binary data
        const videoBuffer = await hfResponse.arrayBuffer();

        // Convert video to base64 so frontend can receive it
        const base64Video = arrayBufferToBase64(videoBuffer);

        return jsonResponse({
          success: true,
          provider: "Hugging Face",
          model: MODEL,
          ratio: ratio,
          video: `data:video/mp4;base64,${base64Video}`
        });

      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: "Server error",
            details: error.message
          },
          500
        );
      }
    }

    return jsonResponse(
      {
        success: false,
        error: "Route not found"
      },
      404
    );
  }
};


// -----------------------------
// Helper functions
// -----------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}


function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}


function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);

  let binary = "";

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(
      i,
      Math.min(i + chunkSize, bytes.length)
    );

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
    }
