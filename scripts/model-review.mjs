import fs from "node:fs/promises";

const briefPath = "/home/ubuntu/multiwing-client-portal/docs/aws-migration-review-brief.md";
const brief = await fs.readFile(briefPath, "utf8");

const instruction = `You are one of three independent senior cloud-migration reviewers. Review the following non-sensitive architecture brief. Do not recommend an irreversible cutover until data reconciliation, rollback, media integrity, client/guest access, email, scheduling, and transcoding are tested. Be concise but concrete. Return sections named: Recommendation, Highest Risks, Reversible Sequence, Authentication, Media, Data Integrity, Cutover Gates, and Disagreements With Baseline.\n\n${brief}`;

async function requestOpenAI() {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a rigorous cloud-security and data-migration architect." },
        { role: "user", content: instruction },
      ],
      temperature: 0.2,
      max_tokens: 1800,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI request failed with HTTP ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "No OpenAI review content returned.";
}

async function requestGrok() {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4-1-fast-non-reasoning",
      messages: [
        { role: "system", content: "You are a skeptical cloud-platform reviewer focused on operational failure modes and reversible migrations." },
        { role: "user", content: instruction },
      ],
      temperature: 0.2,
      max_tokens: 1800,
    }),
  });
  if (!response.ok) throw new Error(`Grok request failed with HTTP ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "No Grok review content returned.";
}

async function requestAnthropic() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1800,
      temperature: 0.2,
      system: "You are a careful principal engineer reviewing a high-stakes data and media migration for a client portal.",
      messages: [{ role: "user", content: instruction }],
    }),
  });
  if (!response.ok) throw new Error(`Anthropic request failed with HTTP ${response.status}`);
  const data = await response.json();
  return data.content?.find((block) => block.type === "text")?.text ?? "No Anthropic review content returned.";
}

const reviews = await Promise.allSettled([
  requestOpenAI(),
  requestGrok(),
  requestAnthropic(),
]);

for (const [label, result] of ["OpenAI", "Grok", "Anthropic"].map((label, index) => [label, reviews[index]])) {
  console.log(`\n===== ${label.toUpperCase()} REVIEW =====\n`);
  if (result.status === "fulfilled") {
    console.log(result.value);
  } else {
    console.log(`Review unavailable: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
  }
}
