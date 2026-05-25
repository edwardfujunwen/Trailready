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
}

export interface AvailableSite {
  siteId: string;
  siteName: string;
  loop: string;
  type: string;
}
