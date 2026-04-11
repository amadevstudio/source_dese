import type { Request, Response, NextFunction } from "express";
import express from "express";

/**
 * Read body as text instead of using express.json().
 * This allows us to fix control characters before JSON.parse.
 * Stack traces often contain raw newlines/tabs that break strict parsers.
 */
export const lenientJsonParser = express.text({ type: "application/json" });

/**
 * Escape control characters inside JSON string values.
 * Leaves characters outside strings untouched.
 */
function escapeControlCharsInStrings(jsonString: string): string {
  let result = "";
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const prevChar = i > 0 ? jsonString[i - 1] : "";

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"' && prevChar !== "\\") {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      switch (char) {
        case "\n":
          result += "\\n";
          break;
        case "\r":
          result += "\\r";
          break;
        case "\t":
          result += "\\t";
          break;
        case "\f":
          result += "\\f";
          break;
        case "\b":
          result += "\\b";
          break;
        default:
          result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Try to parse JSON body. If strict parsing fails, sanitize control
 * characters and retry.
 */
export const parseLenientJson = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.is("application/json") && typeof req.body === "string") {
    try {
      req.body = JSON.parse(req.body);
      return next();
    } catch {
      try {
        const fixed = escapeControlCharsInStrings(req.body);
        req.body = JSON.parse(fixed);
        return next();
      } catch (parseError) {
        return res.status(400).json({
          error: "Invalid JSON format",
          message:
            "Failed to parse JSON. Ensure all control characters are properly escaped.",
          details:
            parseError instanceof Error ? parseError.message : "Unknown error",
        });
      }
    }
  }
  next();
};
