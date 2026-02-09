import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ClassifyResponse, ExtractedFields } from "@/lib/types";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an expert document classifier and data extractor for the U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB).

You will be given an image of either:
1. An alcohol beverage LABEL (product artwork found on a bottle, can, or package)
2. A COLA APPLICATION form (TTB Form 5100.31 or similar government application document)

Your job is to:
1. CLASSIFY the document as either "label" or "application". If you cannot determine what it is, classify as "unrecognized".
2. EXTRACT structured data fields from the document.

Respond ONLY with valid JSON in this exact format:
{
  "classification": "label" | "application" | "unrecognized",
  "confidence": <number 0-1>,
  "extractedFields": {
    "brandName": "<string or null>",
    "classType": "<string or null>",
    "abv": "<string or null>",
    "netContents": "<string or null>",
    "producerName": "<string or null>",
    "producerAddress": "<string or null>",
    "countryOfOrigin": "<string or null>",
    "beverageType": "<string or null>",
    "governmentWarning": "<string or null>"
  }
}

Classification guidelines:
- LABELS have product artwork, brand imagery, decorative borders, and product information printed on packaging
- APPLICATIONS are structured government forms with labeled fields, form numbers, headers referencing TTB or Department of Treasury
- If the image is neither, classify as "unrecognized"

Extraction guidelines:
- Extract exactly what is written, preserving capitalization and formatting
- For governmentWarning, extract the complete text including the "GOVERNMENT WARNING:" header
- For beverageType, determine if it's "Beer", "Wine", or "Distilled Spirits"
- If a field is not present or not readable, use null
- For the confidence score, use 0.9+ if clearly identifiable, 0.6-0.9 if somewhat unclear, below 0.6 if very uncertain`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type
    let mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" =
      "image/png";
    if (file.type === "image/jpeg" || file.type === "image/jpg") {
      mediaType = "image/jpeg";
    } else if (file.type === "image/webp") {
      mediaType = "image/webp";
    } else if (file.type === "image/png") {
      mediaType = "image/png";
    }

    // For PDFs, we send as a document
    const isPdf = file.type === "application/pdf";

    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = isPdf
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: "Classify this document and extract all fields. Respond with JSON only.",
          },
        ]
      : [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: "text" as const,
            text: "Classify this document and extract all fields. Respond with JSON only.",
          },
        ];

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content,
        },
      ],
    });

    // Parse the response
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const result: ClassifyResponse = JSON.parse(jsonStr);

    // Clean up null strings to undefined
    const fields = result.extractedFields;
    const cleanedFields: ExtractedFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== "null" && value !== "") {
        (cleanedFields as Record<string, string>)[key] = value as string;
      }
    }

    return NextResponse.json({
      classification: result.classification,
      confidence: result.confidence,
      extractedFields: cleanedFields,
    } satisfies ClassifyResponse);
  } catch (error) {
    console.error("Classification error:", error);

    // Surface specific error messages for common issues
    let message = "Failed to classify document";
    let status = 500;

    if (error instanceof Error) {
      if (error.message.includes("401")) {
        message = "Invalid API key. Check your ANTHROPIC_API_KEY in .env.local";
        status = 401;
      } else if (error.message.includes("429")) {
        message = "Rate limited. Please wait a moment and try again.";
        status = 429;
      } else if (error.message.includes("413") || error.message.includes("too large")) {
        message = "File too large for API processing. Try a smaller file.";
        status = 413;
      }
    }

    return NextResponse.json({ error: message }, { status });
  }
}
