import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateReview } from "@/lib/compliance";

export const runtime = "nodejs";

const reviewInputSchema = z.object({
  productName: z.string().default(""),
  productType: z.string().default(""),
  ingredientsText: z.string().default(""),
  labelText: z.string().default(""),
  origin: z.string().default(""),
  manufacturer: z.string().default(""),
  hsCode: z.string().optional(),
  incoterms: z.string().optional(),
  shipmentPurpose: z.string().optional(),
  invoiceValue: z.string().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reviewInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid review input",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const result = evaluateReview(parsed.data);
  return NextResponse.json(result);
}
