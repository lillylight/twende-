// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  PASSENGER = 'PASSENGER',
  DRIVER = 'DRIVER',
  OPERATOR = 'OPERATOR',
  RTSA_OFFICER = 'RTSA_OFFICER',
  ADMIN = 'ADMIN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  EXPIRED = 'EXPIRED',
}

export enum PaymentMethod {
  MTN_MOMO = 'MTN_MOMO',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  ZAMTEL_KWACHA = 'ZAMTEL_KWACHA',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  CASH = 'CASH',
}

export enum JourneyStatus {
  SCHEDULED = 'SCHEDULED',
  BOARDING = 'BOARDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELAYED = 'DELAYED',
  ARRIVED = 'ARRIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AlertType {
  SPEED_VIOLATION = 'SPEED_VIOLATION',
  HARSH_BRAKING = 'HARSH_BRAKING',
  GEOFENCE_BREACH = 'GEOFENCE_BREACH',
  ROUTE_DEVIATION = 'ROUTE_DEVIATION',
  FATIGUE_WARNING = 'FATIGUE_WARNING',
  VEHICLE_BREAKDOWN = 'VEHICLE_BREAKDOWN',
  ACCIDENT = 'ACCIDENT',
  SOS = 'SOS',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  LICENSE_EXPIRY = 'LICENSE_EXPIRY',
  INSURANCE_EXPIRY = 'INSURANCE_EXPIRY',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SOSStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM',
}

// ─── Core Interfaces ─────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  phone: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Passenger {
  id: string;
  userId: string;
  user: User;
  nrcNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  preferredPaymentMethod: PaymentMethod | null;
  loyaltyPoints: number;
  bookings: Booking[];
  ratings: Rating[];
}

export interface Driver {
  id: string;
  userId: string;
  user: User;
  operatorId: string;
  operator: Operator;
  licenseNumber: string;
  licenseExpiry: Date;
  licenseClass: string;
  isAvailable: boolean;
  currentVehicleId: string | null;
  totalTrips: number;
  averageRating: number;
  fatigueHoursToday: number;
  lastRestTime: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Operator {
  id: string;
  userId: string;
  user: User;
  companyName: string;
  rtsaLicenseNumber: string;
  rtsaLicenseExpiry: Date;
  registrationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  province: string;
  isApproved: boolean;
  fleetSize: number;
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  operatorId: string;
  operator: Operator;
  registrationPlate: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  vehicleType: string;
  insuranceExpiry: Date;
  fitnessExpiry: Date;
  gpsDeviceId: string | null;
  isActive: boolean;
  currentDriverId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: string;
  operatorId: string;
  operator: Operator;
  name: string;
  routeCode: string;
  origin: string;
  destination: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  waypoints: RouteWaypoint[];
  distanceKm: number;
  estimatedDurationMinutes: number;
  baseFareZmw: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteWaypoint {
  id: string;
  routeId: string;
  name: string;
  lat: number;
  lng: number;
  orderIndex: number;
  isStop: boolean;
  fareFromOriginZmw: number | null;
}

export interface Journey {
  id: string;
  routeId: string;
  route: Route;
  vehicleId: string;
  vehicle: Vehicle;
  driverId: string;
  driver: Driver;
  status: JourneyStatus;
  scheduledDeparture: Date;
  actualDeparture: Date | null;
  scheduledArrival: Date;
  actualArrival: Date | null;
  currentPassengerCount: number;
  maxCapacity: number;
  currentLat: number | null;
  currentLng: number | null;
  currentSpeed: number | null;
  headingDegrees: number | null;
  bookings: Booking[];
  gpsLogs: GPSLog[];
  alerts: SafetyAlert[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Booking {
  id: string;
  passengerId: string;
  passenger: Passenger;
  journeyId: string;
  journey: Journey;
  bookingReference: string;
  status: BookingStatus;
  seatNumber: string | null;
  boardingPoint: string;
  alightingPoint: string;
  fareZmw: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  paymentTransactionId: string | null;
  bookedViaUssd: boolean;
  qrCode: string | null;
  checkedInAt: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GPSPosition {
  lat: number;
  lng: number;
  altitude: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: Date;
}

export interface GPSLog {
  id: string;
  journeyId: string;
  vehicleId: string;
  driverId: string;
  lat: number;
  lng: number;
  altitude: number | null;
  speed: number;
  heading: number;
  accuracy: number | null;
  engineStatus: boolean;
  fuelLevel: number | null;
  odometer: number | null;
  recordedAt: Date;
  createdAt: Date;
}

export interface SafetyAlert {
  id: string;
  journeyId: string | null;
  journey: Journey | null;
  vehicleId: string;
  vehicle: Vehicle;
  driverId: string | null;
  driver: Driver | null;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  speedAtAlert: number | null;
  speedLimit: number | null;
  isAcknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface Rating {
  id: string;
  passengerId: string;
  passenger: Passenger;
  journeyId: string;
  journey: Journey;
  driverId: string;
  driver: Driver;
  score: number;
  comment: string | null;
  safetyRating: number | null;
  cleanlinessRating: number | null;
  punctualityRating: number | null;
  createdAt: Date;
}

export interface SOSEvent {
  id: string;
  journeyId: string | null;
  journey: Journey | null;
  triggeredByUserId: string;
  triggeredByUser: User;
  vehicleId: string | null;
  vehicle: Vehicle | null;
  status: SOSStatus;
  lat: number;
  lng: number;
  description: string | null;
  responderId: string | null;
  responderNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface USSDSession {
  id: string;
  sessionId: string;
  phoneNumber: string;
  serviceCode: string;
  currentStep: string;
  stepData: Record<string, unknown>;
  userId: string | null;
  isActive: boolean;
  lastInput: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  timestamp: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export interface TrackingUpdate {
  journeyId: string;
  vehicleId: string;
  position: GPSPosition;
  status: JourneyStatus;
  passengerCount: number;
  nextStop: string | null;
  etaMinutes: number | null;
}

export interface DashboardStats {
  activeJourneys: number;
  totalPassengersToday: number;
  activeAlerts: number;
  fleetUtilization: number;
  revenueToday: number;
  onTimePercentage: number;
  sosEventsActive: number;
  averageRating: number;
}

export interface PaymentInitiation {
  bookingId: string;
  amount: number;
  currency: 'ZMW';
  method: PaymentMethod;
  phoneNumber?: string;
  returnUrl?: string;
}

export interface PaymentResult {
  transactionId: string;
  status: PaymentStatus;
  amount: number;
  currency: 'ZMW';
  method: PaymentMethod;
  reference: string;
  completedAt: Date | null;
}

export interface RouteSearchParams {
  origin?: string;
  destination?: string;
  date?: string;
  passengers?: number;
  page?: number;
  pageSize?: number;
}

export interface JourneySearchResult {
  journey: Journey;
  availableSeats: number;
  fare: number;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  operatorName: string;
}

export interface USSDRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

export interface USSDResponse {
  response: string;
  endSession: boolean;
}
