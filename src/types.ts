export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TripSummary {
  title: string;
  description: string;
  startingCity: string;
  destination: string;
  coordinates?: Coordinates;
  startDate?: string;
  endDate?: string;
  budget?: string;
  currency?: string;
}

export interface Activity {
  time: string;
  title: string;
  description: string;
  locationName: string;
  coordinates?: Coordinates;
  cost?: string;
}

export interface TripDay {
  day: number;
  date?: string;
  dailyCost?: string;
  activities: Activity[];
}

export interface Accommodation {
  name: string;
  type: string;
  rating?: string;
  price?: string;
  location: string;
  coordinates?: Coordinates;
  description: string;
}

export interface HiddenGem {
  name: string;
  description: string;
  coordinates?: Coordinates;
}

export interface TripPlan {
  summary: TripSummary;
  weather?: {
    season: string;
    temperature: string;
    clothing: string[];
  };
  transportation?: { type: string; details: string; cost: string }[];
  accommodations?: Accommodation[];
  itinerary?: TripDay[];
  food?: { meal: string; recommendation: string; cost: string }[];
  budgetBreakdown?: {
    flights: number;
    accommodation: number;
    food: number;
    activities: number;
    total: number;
    currency: string;
    homeCurrency?: string;
    totalInHomeCurrency?: number;
  };
  moneyExchangePlan?: {
    recommendation: string;
    nearbyExchanges: { name: string; address: string; description: string }[];
  };
  checklists?: {
    packing: string[];
    documents: string[];
  };
  safety?: string[];
  emergency?: { police: string; hospital: string; embassy: string };
  tips?: string[];
  hiddenGems?: HiddenGem[];
  ecoFriendly?: string[];
}
