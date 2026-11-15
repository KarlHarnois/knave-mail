export class UnsupportedHeaderError extends Error {
  constructor(headerName: string) {
    super(`send: unsupported header "${headerName}", only To, Cc and Subject are sent`);
    this.name = "UnsupportedHeaderError";
  }
}
