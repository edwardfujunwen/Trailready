export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: number;
}

export interface WeatherSummary {
  tempHighF: number;
  tempLowF: number;
  precipRisk: 'low' | 'medium' | 'high';
  windSpeed: string;
  conditions: string;
}
