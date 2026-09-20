import { Request, Response, NextFunction } from 'express';

export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.AARTHIKLABS_API_KEY) {
     res.status(401).json({ 
       error: 'unauthorized', 
       message: 'Invalid or missing x-api-key header' 
     });
     return;
  }
  
  next();
};

