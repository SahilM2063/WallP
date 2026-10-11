import { createHash, randomBytes } from 'node:crypto';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const issueToken = () => randomBytes(32).toString('base64url');
const list = (value?: string) =>
  (value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
export function isOwner(email: string, sub: string, ownerEmails: string, pinnedSubs?: string) {
  const subs = list(pinnedSubs);
  return (
    list(ownerEmails.toLowerCase()).includes(email.toLowerCase()) &&
    (!subs.length || subs.includes(sub))
  );
}
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
