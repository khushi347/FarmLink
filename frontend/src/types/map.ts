export type LatLngTuple = [number, number];

export interface MapOwner {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface MapShop {
  id: string;
  name: string;
  category: string[];
  phone: string;
  village: string;
  coordinates: LatLngTuple; // [latitude, longitude] for Leaflet
  rawCoordinates: [number, number]; // [longitude, latitude] GeoJSON
  owner?: MapOwner | null;
  type: "shop";
}

export interface MapProduct {
  name: string;
  quantity: number;
  unit?: string;
}

export interface MapFarmer {
  id: string;
  name: string;
  phone: string;
  language: string;
}

export interface MapOrder {
  id: string;
  code: string;
  serviceType: string;
  products: MapProduct[];
  status: "Pending" | "Grouped" | "Accepted" | "Completed" | "Cancelled";
  requestedDate?: string | null;
  transcript: string;
  audioUrl?: string | null;
  tripBlockId?: string | null;
  farmer?: MapFarmer | null;
  assignedShop?: {
    id: string;
    name: string;
    village: string;
  } | null;
  coordinates: LatLngTuple; // [latitude, longitude]
  rawCoordinates: [number, number];
  type: "order";
}

export interface MapPopulatedOrder {
  id: string;
  code: string;
  products: MapProduct[];
  serviceType?: string;
  status?: string;
  coordinates?: LatLngTuple | null;
}

export interface MapCorridor {
  originPoints: LatLngTuple[];
  centerPoint: LatLngTuple;
  destinationPoint?: LatLngTuple | null;
}

export interface MapTripBlock {
  id: string;
  code: string;
  serviceType: string;
  status: "OPEN" | "Pending" | "CLAIMED" | "LOCKED" | "IN DELIVERY" | "COMPLETED";
  scheduledDate?: string;
  estimatedEarnings: number;
  completedAt?: string | null;
  claimedAt?: string | null;
  centerCoordinates: LatLngTuple; // [latitude, longitude]
  rawCenterCoordinates: [number, number];
  orderCount: number;
  totalQuantity: number;
  orders: MapPopulatedOrder[];
  assignedShop?: {
    id: string;
    name: string;
    village: string;
    coordinates?: LatLngTuple | null;
  } | null;
  corridor: MapCorridor;
  type: "tripblock";
}

export interface MapStats {
  totalShops: number;
  totalOrders: number;
  pendingOrders: number;
  groupedOrders: number;
  openTripBlocks: number;
  claimedTripBlocks: number;
  completedTripBlocks: number;
}

export interface MapDataResponse {
  success: boolean;
  data: {
    shops: MapShop[];
    orders: MapOrder[];
    tripBlocks: MapTripBlock[];
    stats: MapStats;
  };
  message?: string;
}

export type MapLayerFilter = "all" | "shops" | "orders" | "tripblocks";

export interface MapFilterState {
  layer: MapLayerFilter;
  serviceType: string; // "ALL" or specific type
  status: string; // "ALL" or specific status
  searchQuery: string;
}

export type SelectedMapEntity =
  | { type: "shop"; data: MapShop }
  | { type: "order"; data: MapOrder }
  | { type: "tripblock"; data: MapTripBlock }
  | null;
