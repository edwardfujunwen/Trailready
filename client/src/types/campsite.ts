export interface Campground {
  id: string;
  name: string;
  lat: number;
  lon: number;
  description: string;
  reservationUrl: string;
  imageUrl?: string;
  availableSites?: AvailableSite[];
  availabilityChecked?: boolean;
  source?: 'recreation.gov' | 'other';
}

export interface AvailableSite {
  siteId: string;
  siteName: string;
  loop: string;
  type: string;
}
