export class Biso24ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "Biso24ApiError";
  }
}

/** Logging in with the configured account failed. */
export class Biso24AuthError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "Biso24AuthError";
  }
}
