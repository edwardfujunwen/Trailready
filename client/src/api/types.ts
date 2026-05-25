export interface TripContext {
  location: string;
  nights: number;
  checkin: string;
  checkout: string;
  elevationFt?: number;
  tempHighF?: number;
  tempLowF?: number;
  precipRisk?: 'low' | 'medium' | 'high';
  windSpeed?: string;
  tripType?: string;
  trailName?: string;
  trailDistanceMi?: number;
  groupSize?: number;
}
