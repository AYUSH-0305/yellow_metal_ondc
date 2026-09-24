import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // Buffers must be equal length for timingSafeEqual, so a length
  // mismatch alone must not short-circuit the comparison timing.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const expected = process.env.AARTHIKLABS_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !expected || !safeCompare(apiKey, expected)) {
     res.status(401).json({
       error: 'unauthorized',
       message: 'Invalid or missing x-api-key header'
     });
     return;
  }

  next();
};

// Separate from requireApiKey (and a separate INTERNAL_API_KEY, not
// AARTHIKLABS_API_KEY): the internal routes are staff/dashboard-facing,
// a different trust boundary from the AarthikLabs partner integration.
// One shared key here is a stopgap, not real per-user access control —
// swap for real staff auth once the dashboard has accounts.
export const requireInternalApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const expected = process.env.INTERNAL_API_KEY;

  if (!apiKey || typeof apiKey !== 'string' || !expected || !safeCompare(apiKey, expected)) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or missing x-api-key header',
    });
    return;
  }

  next();
};

