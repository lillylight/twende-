// Shared TypeScript types and interfaces

export type UserType = 'passenger' | 'driver' | 'operator' | 'rtsa_official';
export type Language = 'en' | 'bem' | 'nya';
export type BookingStatus = 'reserved' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'pending' | 'initiated' | 'success' | 'failed' | 'expired';
export type MobileMoneyProvider = 'airtel_money' | 'mtn_momo' | 'zamtel_kwacha';
export type JourneyStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
export type ViolationType = 'speed' | 'route_deviation';
export type Severity = 'low' | 'medium' | 'high';
export type SOSStatus = 'active' | 'resolved' | 'false_alarm';

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  userType: UserType;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingReference: string;
  passengerId: string;
  journeyId: string;
  seatNumber: number;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  status: BookingStatus;
  qrCode?: string;
  source: 'app' | 'ussd';
  isBoarded: boolean;
  boardedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
  confirmedAt?: Date;
  cancelledAt?: Date;
}

export interface GPSData {
  journeyId: string;
  driverId: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  timestamp: Date;
  isBuffered: boolean;
}
