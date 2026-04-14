"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export function SwaggerUIClient() {
  return <SwaggerUI url="/api/swagger.json" />;
}
