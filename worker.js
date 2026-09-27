const MODEL = "Wan-AI/Wan2.1-T2V-1.3B";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

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
        if (!env.HF_TOKEN) {
          return jsonResponse(
            {
              success: false,
              error: "HF_TOKEN is missing"
            },
            500
          );
        }

        const body = await request.json();

        const prompt = body.prompt;

        if (!prompt || typeof prompt !== "string") {
          return jsonResponse(
            {
              success: false,
              error: "Prompt is required"
            },
            400
          );
        }

        /*
         * Hugging Face Inference Providers
         *
         * :fastest automatically selects an available
         * provider for the model.
         */
        const model = `${MODEL}:fastest`;

        const response = await fetch(
          "https://router.huggingface.co/hf-inference/models/" + model,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.HF_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                negative_prompt:
                  "blurry, low quality, distorted, deformed, watermark, text, logo",
                num_frames: 49,
                guidance_scale: 7.5,
                num_inference_steps: 25
              }
            })
          }
        );

        /*
         * If Hugging Face returns an error,
         * send the actual error to the frontend.
         */
        if (!response.ok) {
          const errorText = await response.text();

          return jsonResponse(
            {
              success: false,
              error: "Hugging Face request failed",
              status: response.status,
              details: errorText
            },
            response.status
          );
        }

        /*
         * Successful response = raw video bytes.
         */
        const videoBuffer = await response.arrayBuffer();

        const base64Video = arrayBufferToBase64(videoBuffer);

        return jsonResponse({
          success: true,
          provider: "Hugging Face",
          model: MODEL,
          video: `data:video/mp4;base64,${base64Video}`
        });

      } catch (error) {
        return jsonResponse(
          {
            success: false,
            error: "Worker error",
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


// ------------------------------------
// CORS
// ------------------------------------

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization"
  };
}


// ------------------------------------
// JSON response
// ------------------------------------

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}


// ------------------------------------
// ArrayBuffer → Base64
// ------------------------------------

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
