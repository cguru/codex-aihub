export type AihubErrorCode =
  | "AIHUB_API_KEY_MISSING"
  | "AIHUB_API_CHANGED"
  | "AIHUB_ARCHIVE_INVALID"
  | "AIHUB_ARCHIVE_UNSAFE"
  | "AIHUB_AUTH_FAILED"
  | "AIHUB_DATASET_NOT_FOUND"
  | "AIHUB_DESTINATION_EXISTS"
  | "AIHUB_DOWNLOAD_FAILED"
  | "AIHUB_DOWNLOAD_NOT_APPROVED"
  | "AIHUB_FILE_NOT_FOUND"
  | "AIHUB_HTTP_ERROR"
  | "AIHUB_INSUFFICIENT_DISK"
  | "AIHUB_INVALID_CONFIG"
  | "AIHUB_INVALID_DESTINATION"
  | "AIHUB_NETWORK_ERROR"
  | "AIHUB_REQUEST_FAILED"
  | "AIHUB_TIMEOUT";

export class AihubError extends Error {
  readonly code: AihubErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly endpoint?: string;

  constructor(
    code: AihubErrorCode,
    message: string,
    options: {
      retryable?: boolean;
      status?: number;
      endpoint?: string;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AihubError";
    this.code = code;
    this.retryable = options.retryable ?? false;
    if (options.status !== undefined) {
      this.status = options.status;
    }
    if (options.endpoint !== undefined) {
      this.endpoint = options.endpoint;
    }
  }
}

export function publicError(error: unknown): {
  code: AihubErrorCode;
  message: string;
  retryable: boolean;
} {
  if (error instanceof AihubError) {
    return {
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    code: "AIHUB_REQUEST_FAILED",
    message: "AI Hub 요청을 처리하지 못했습니다.",
    retryable: false,
  };
}

export function redactSecret(value: string, secret: string): string {
  if (!secret) {
    return value;
  }
  return value.split(secret).join("[REDACTED]");
}
