/** Unsigned JWT with the given `exp` (epoch seconds); enough for expiry parsing. */
export function fakeJwt(exp?: number, id = "user1"): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256" })}.${encode({ id, exp })}.sig`;
}
