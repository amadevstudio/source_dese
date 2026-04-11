import { Body, Post, Route, Response, Controller } from "tsoa";
import {
  decodeStackTrace,
  type DecodedFrame,
} from "sourcemap-decode";
import { config } from "../config/config.js";

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

    const result = decodeStackTrace(stack, {
      assetsPath: config.sourcemapAssetsPath,
    });

    return { decoded: result.frames ?? [] };
  }
}
