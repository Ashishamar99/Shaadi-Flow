export interface Wedding {
  id: string;
  user_id: string;
  name: string;
  wedding_date: string | null;
  total_budget: number;
  created_at: string;
}

export interface Invitee {
  id: string;
  wedding_id: string;
  name: string;
  address: string | null;
  map_link: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  side: 'bride' | 'groom' | 'mutual' | null;
  priority: 'vip' | 'normal' | 'optional';
  visited: boolean;
  rsvp_status: 'not_invited' | 'invited' | 'pending' | 'confirmed' | 'declined';
  time_constraint: string | null;
  family_id: string | null;
  is_family_head: boolean;
  extra_members: number;
  created_at: string;
}

export interface FamilyGroup {
  familyId: string;
  head: Invitee;
  members: Invitee[];
  headcount: number;
}


export interface TimelineEvent {
  id: string;
  wedding_id: string;
  title: string;
  start_time: string;
  end_time: string;
  location: string | null;
  owner: string | null;
  day_number: number;
  sort_order: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  cost: number;
  paid_amount: number;
  payment_status: 'pending' | 'partial' | 'paid';
  notes: string | null;
  created_at: string;
}

export interface BudgetItem {
  id: string;
  wedding_id: string;
  category: string;
  description: string | null;
  estimated: number;
  actual: number;
  vendor_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  wedding_id: string;
  title: string;
  description: string | null;
  owner: string | null;
  deadline: string | null;
  completed: boolean;
  created_at: string;
}

export interface WeddingMember {
  id: string;
  wedding_id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

export interface RouteDay {
  day: number;
  invitees: Invitee[];
  totalDistance: number;
  totalDuration: number;
  routeGeometry: GeoJSON.LineString | null;
}

export interface ClusterResult {
  clusters: Invitee[][];
  centroids: [number, number][];
}

export type InviteeFormData = Omit<Invitee, 'id' | 'wedding_id' | 'created_at' | 'lat' | 'lng'>;
export type EventFormData = Omit<TimelineEvent, 'id' | 'wedding_id' | 'created_at'>;
