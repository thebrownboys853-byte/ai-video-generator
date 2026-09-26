import { InferenceClient } from "@huggingface/inference";

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          status: "ok",
          message: "AI Video Generator API is running",
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Generate video
    if (url.pathname === "/api/generate" && request.method === "POST") {
      try {
        if (!env.HF_TOKEN) {
          return new Response(
            JSON.stringify({
              error: "HF_TOKEN is not configured in Cloudflare.",
            }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        const body = await request.json();

        const prompt = body.prompt;

        if (!prompt || typeof prompt !== "string") {
          return new Response(
            JSON.stringify({
              error: "Please provide a prompt.",
            }),
            {
              status: 400,
              headers: {
                "Content-Type": "application/json",
                ...corsHeaders,
              },
            }
          );
        }

        const client = new InferenceClient(env.HF_TOKEN);

        // Text-to-video model
        const video = await client.textToVideo({
          model: "Lightricks/LTX-Video-0.9.8-13B-distilled",
          inputs: prompt,
        });

        // Return generated video
        return new Response(video, {
          status: 200,
          headers: {
            "Content-Type": "video/mp4",
            "Cache-Control": "no-store",
            ...corsHeaders,
          },
        });

      } catch (error) {
        console.error("HF VIDEO ERROR:", error);

        return new Response(
          JSON.stringify({
            error: "Video generation failed",
            message: error?.message || String(error),
          }),
          {
            status: 500,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        error: "Not found",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  },
};
