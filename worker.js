const MODEL = "fal-ai/wan/v2.2-a14b/text-to-video";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // Generate video
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const { prompt, ratio } = await request.json();

        if (!prompt) {
          return json({
            error: "Prompt is required"
          }, 400);
        }

        // Cloudflare Secret
        const HE_TOKEN = env.HE_TOKEN;

        if (!HE_TOKEN) {
          return json({
            error: "HE_TOKEN is missing in Cloudflare Worker Secrets"
          }, 500);
        }

        const response = await fetch(
          `https://queue.fal.run/${MODEL}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Key ${HE_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              prompt,
              aspect_ratio: ratio || "16:9"
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return json({
            error: "fal.ai request failed",
            status: response.status,
            details: data
          }, response.status);
        }

        return json(data, 200);

      } catch (error) {
        return json({
          error: "Server error",
          message: error.message
        }, 500);
      }
    }

    return json({
      error: "Not found"
    }, 404);
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
