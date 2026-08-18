import fs from "node:fs/promises";

const brief = await fs.readFile(
  "/home/ubuntu/multiwing-client-portal/docs/aws-migration-review-brief.md",
  "utf8",
);

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
    system: "You are a careful principal engineer reviewing a high-stakes data and media migration for a client portal. Provide a concise, rigorous, and reversible migration critique.",
    messages: [{
      role: "user",
      content: `Review this non-sensitive architecture brief. Return sections named Recommendation, Highest Risks, Reversible Sequence, Authentication, Media, Data Integrity, Cutover Gates, and Disagreements With Baseline.\n\n${brief}`,
    }],
  }),
});

const responseText = await response.text();
if (!response.ok) {
  throw new Error(`Anthropic request failed with HTTP ${response.status}: ${responseText.slice(0, 600)}`);
}

const data = JSON.parse(responseText);
const text = data.content?.find((block) => block.type === "text")?.text;
if (!text) throw new Error("Anthropic response contained no text review.");
console.log(text);
