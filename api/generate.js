const MODEL = "fal-ai/wan/v2.2-a14b/text-to-video";

export async function onRequestPost(context) {
  try {
    const { prompt, ratio } = await context.request.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Your HE_TOKEN secret
    const HE_TOKEN = context.env.HE_TOKEN;

    if (!HE_TOKEN) {
      return new Response(
        JSON.stringify({
          error: "HE_TOKEN is missing in Cloudflare Secrets"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
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
          prompt: prompt,
          aspect_ratio: ratio || "16:9"
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "fal.ai request failed",
          status: response.status,
          details: data
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Server error",
        message: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
