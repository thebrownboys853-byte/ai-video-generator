const MODEL = "fal-ai/wan/v2.2-a14b/text-to-video";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Generate video
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        const { prompt, ratio } = await request.json();

        if (!prompt || !prompt.trim()) {
          return Response.json(
            {
              success: false,
              message: "Video prompt is required"
            },
            { status: 400 }
          );
        }

        const response = await fetch(`https://queue.fal.run/${MODEL}`, {
          method: "POST",
          headers: {
            "Authorization": `Key ${env.FAL_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: prompt.trim(),
            aspect_ratio: ratio || "16:9",
            resolution: "720p"
          })
        });

        const data = await response.json();

        if (!response.ok) {
          return Response.json(
            {
              success: false,
              message: data?.error || data?.message || `fal.ai request failed (${response.status})`,
              error: data
            },
            { status: response.status }
          );
        }

        return Response.json({
          success: true,
          request_id: data.request_id
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    // Check video generation status
    if (url.pathname === "/api/status" && request.method === "GET") {
      try {
        const requestId = url.searchParams.get("id");

        if (!requestId) {
          return Response.json(
            {
              success: false,
              message: "Request ID is required"
            },
            { status: 400 }
          );
        }

        const response = await fetch(
          `https://queue.fal.run/${MODEL}/requests/${requestId}/status`,
          {
            headers: {
              "Authorization": `Key ${env.FAL_KEY}`
            }
          }
        );

        const data = await response.json();

        return Response.json(data, {
          status: response.status
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    // Get completed result
    if (url.pathname === "/api/result" && request.method === "GET") {
      try {
        const requestId = url.searchParams.get("id");

        if (!requestId) {
          return Response.json(
            {
              success: false,
              message: "Request ID is required"
            },
            { status: 400 }
          );
        }

        const response = await fetch(
          `https://queue.fal.run/${MODEL}/requests/${requestId}`,
          {
            headers: {
              "Authorization": `Key ${env.FAL_KEY}`
            }
          }
        );

        const data = await response.json();

        return Response.json(data, {
          status: response.status
        });

      } catch (error) {
        return Response.json(
          {
            success: false,
            message: error.message
          },
          { status: 500 }
        );
      }
    }

    // Serve website files
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("AI Video Generator", {
      status: 200
    });
  }
};
