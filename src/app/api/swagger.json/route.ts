import { NextResponse } from "next/server";

import { generateOpenApiSpec } from "@/lib/openapi";

export function GET() {
  return NextResponse.json(generateOpenApiSpec());
}
