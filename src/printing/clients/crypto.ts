import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

const linkCodeSecret = () => {
  const secret = process.env.PRINT_CLIENT_LINK_CODE_SECRET;
  if (!secret) throw new Error("PRINT_CLIENT_LINK_CODE_SECRET is required");
  return secret;
};

export const generateLinkCode = () =>
  randomInt(10_000).toString().padStart(4, "0");
export const hashLinkCode = (code: string) =>
  createHmac("sha256", linkCodeSecret()).update(code).digest("hex");
export const createCredential = () =>
  `lpk_${randomBytes(32).toString("base64url")}`;
export const hashCredential = (credential: string) =>
  createHash("sha256").update(credential).digest("hex");
