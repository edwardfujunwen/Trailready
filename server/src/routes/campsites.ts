import { Router, Request, Response } from 'express';
import { searchCampgrounds, getCampgroundAvailability } from '../services/recreation';

export const campsitesRouter = Router();

campsitesRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius = '25' } = req.query as Record<string, string>;
    if (!lat || !lon) {
      res.status(400).json({ error: 'lat and lon required' });
      return;
    }
    const campgrounds = await searchCampgrounds(parseFloat(lat), parseFloat(lon), parseInt(radius));
    res.json(campgrounds);
  } catch (err) {
    console.error('Campground search error:', err);
    res.status(500).json({ error: 'Failed to search campgrounds' });
  }
});

campsitesRouter.get('/availability/:campgroundId', async (req: Request, res: Response) => {
  try {
    const { campgroundId } = req.params;
    const { checkin, checkout } = req.query as Record<string, string>;
    if (!checkin || !checkout) {
      res.status(400).json({ error: 'checkin and checkout dates required' });
      return;
    }
    const availability = await getCampgroundAvailability(campgroundId, new Date(checkin), new Date(checkout));
    res.json(availability);
  } catch (err) {
    console.error('Availability check error:', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});
