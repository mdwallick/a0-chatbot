export class HttpError extends Error {
  info: any
  status: number

  constructor(message: string, status: number, info: any = {}) {
    super(message)
    this.name = "HttpError"
    this.status = status
    this.info = info
    Object.setPrototypeOf(this, HttpError.prototype)
  }
}
