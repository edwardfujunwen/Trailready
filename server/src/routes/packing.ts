import { Router, Request, Response } from 'express';
import { generatePackingList } from '../services/anthropic';

export const packingRouter = Router();

packingRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const tripContext = req.body;
    if (!tripContext?.location) {
      res.status(400).json({ error: 'Missing trip context' });
      return;
    }
    const packingList = await generatePackingList(tripContext);
    res.json(packingList);
  } catch (err) {
    console.error('Packing list generation error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});
