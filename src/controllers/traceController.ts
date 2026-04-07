import { Body, Post, Route, Response, Controller } from "tsoa";
import { parseStackTrace } from "../utils/stackParser.js";
import { decodeFrame, type DecodedFrame } from "../utils/sourceMapDecoder.js";

export interface DecodeTraceRequest {
  /** Raw stack trace string from the browser */
  stack: string;
}

export interface DecodeTraceResponse {
  /** Array of decoded frames with original source locations */
  decoded: DecodedFrame[];
}

@Route("api/trace")
export class TraceController extends Controller {
  /**
   * Decode a minified stack trace to original source locations.
   *
   * Accepts a raw browser stack trace, parses individual frames,
   * and maps each back to the original source using .map files.
   *
   * Handles single-line minified bundles by recalculating absolute
   * column positions from the multi-line browser representation.
   */
  @Post("decode")
  @Response<DecodeTraceResponse>(200, "Decoded stack trace")
  public async decodeFrontendStackTrace(
    @Body() body: DecodeTraceRequest
  ): Promise<DecodeTraceResponse> {
    const { stack } = body;

    const frames = parseStackTrace(stack);
    const decoded = frames.map((frame) => decodeFrame(frame));

    return { decoded };
  }
}
