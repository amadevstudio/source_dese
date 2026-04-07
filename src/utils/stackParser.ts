/**
 * Parse a browser stack trace string into structured frames.
 *
 * Supports common browser formats:
 *   at App (https://example.com/assets/index-BHIGUbEz.js:263:19964)
 *   at https://example.com/assets/chunk-abc123.js:1:42
 */
export interface StackFrame {
  file: string;
  line: number;
  column: number;
  functionName?: string;
  originalLine?: string;
}

// Matches JS file references in URLs: protocol://host/path/file.js:line:col
const STACK_RE = /https?:\/\/[^)]+\/([^/:]+\.js):(\d+):(\d+)/g;
const FUNCTION_RE = /at\s+([^\s(]+)/;

export function parseStackTrace(stack: string): StackFrame[] {
  const frames: StackFrame[] = [];
  const lines = stack.split("\n");

  for (const line of lines) {
    STACK_RE.lastIndex = 0;
    const match = STACK_RE.exec(line);
    if (match && match[1] && match[2] && match[3]) {
      const frame: StackFrame = {
        file: match[1],
        line: Number.parseInt(match[2], 10),
        column: Number.parseInt(match[3], 10),
        originalLine: line.trim(),
      };

      const functionMatch = line.match(FUNCTION_RE);
      if (functionMatch?.[1]) {
        frame.functionName = functionMatch[1];
      }

      frames.push(frame);
    }
  }

  return frames;
}
