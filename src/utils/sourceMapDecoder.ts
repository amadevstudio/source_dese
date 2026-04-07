import fs from "fs";
import path from "path";
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping";
import type { StackFrame } from "./stackParser.js";
import { config } from "../config/config.js";

export interface DecodedFrame {
  file?: string;
  line?: number;
  column?: number;
  function?: string;
  originalFile?: string;
  originalLine?: number;
  originalColumn?: number;
  error?: string;
}

const ASSETS_PATH = config.sourcemapAssetsPath;

/**
 * Calculate absolute column position for single-line sourcemaps.
 *
 * Browsers display minified single-line bundles as multi-line text,
 * so line:col from the browser needs to be converted to an absolute
 * offset within the single sourcemap line.
 */
function toAbsoluteColumn(jsPath: string, line: number, col: number): number {
  const data = fs.readFileSync(jsPath, "utf-8");
  const lines = data.split("\n");

  if (line < 1 || line > lines.length) {
    throw new Error("Line out of range");
  }

  let absCol = 0;
  for (let i = 0; i < line - 1; i++) {
    absCol += (lines[i]?.length ?? 0) + 1;
  }
  absCol += col - 1;

  return absCol;
}

function getMappingLines(mapJson: { mappings?: string }): number {
  if (!mapJson.mappings) return 0;
  return mapJson.mappings.split(";").length;
}

/**
 * Decode a single stack frame using its corresponding .map file.
 */
export function decodeFrame(frame: StackFrame): DecodedFrame {
  const jsPath = path.join(ASSETS_PATH, frame.file);
  const mapPath = `${jsPath}.map`;

  const base: DecodedFrame = {
    originalFile: frame.file,
    originalLine: frame.line,
    originalColumn: frame.column,
    ...(frame.functionName ? { function: frame.functionName } : {}),
  };

  try {
    if (!fs.existsSync(jsPath)) {
      return { ...base, error: `JS file not found: ${frame.file}` };
    }

    if (!fs.existsSync(mapPath)) {
      return { ...base, error: `Sourcemap not found: ${frame.file}.map` };
    }

    const mapContent = fs.readFileSync(mapPath, "utf-8");
    const mapJson = JSON.parse(mapContent);
    const traceMap = new TraceMap(mapJson);

    const data = fs.readFileSync(jsPath, "utf-8");
    const bundleLines = data.split("\n").length;
    const mappingLines = getMappingLines(mapJson);

    let pos;
    if (mappingLines === 1 && bundleLines > 1) {
      // Single-line sourcemap with multi-line browser display
      const absCol = toAbsoluteColumn(jsPath, frame.line, frame.column);
      pos = originalPositionFor(traceMap, {
        line: 1,
        column: Math.max(absCol, 0),
      });
    } else {
      pos = originalPositionFor(traceMap, {
        line: frame.line,
        column: Math.max(frame.column - 1, 0),
      });
    }

    if (!pos?.source) {
      return { ...base, error: "No mapping found" };
    }

    return {
      file: pos.source,
      line: pos.line ?? undefined,
      column: pos.column ?? undefined,
      function: pos.name ?? frame.functionName,
      originalFile: frame.file,
      originalLine: frame.line,
      originalColumn: frame.column,
    };
  } catch (e) {
    return {
      ...base,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
