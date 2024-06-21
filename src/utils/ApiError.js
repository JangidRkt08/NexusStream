class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something Went wrong",
    errors = [],
    statck = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = null;
    this.success = false;
    this.error = errors;

    if (statck) {
      this.stack = statck;
    }
    else {
      Error.captureStackTrace(this, this.constructor);
      }
  }
}

export { ApiError };
