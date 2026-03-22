package com.twende.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Auth ────────────────────────────────────────────────────────────────────

@Serializable
data class LoginRequest(
    val phone: String,
    val password: String,
)

@Serializable
data class RegisterRequest(
    val phone: String,
    val password: String,
    val name: String,
    val role: String = "PASSENGER",
)

@Serializable
data class OtpVerifyRequest(
    val phone: String,
    val code: String,
)

@Serializable
data class RefreshRequest(
    @SerialName("refreshToken") val refreshToken: String,
)

@Serializable
data class AuthTokens(
    @SerialName("accessToken") val accessToken: String,
    @SerialName("refreshToken") val refreshToken: String,
)

@Serializable
data class AuthData(
    val user: User,
    val tokens: AuthTokens,
)

@Serializable
data class User(
    val id: String,
    val phone: String,
    @SerialName("firstName") val firstName: String? = null,
    @SerialName("lastName") val lastName: String? = null,
    val name: String? = null,
    val role: String,
    val email: String? = null,
    @SerialName("isVerified") val isVerified: Boolean? = null,
    @SerialName("createdAt") val createdAt: String? = null,
)

// ─── Routes ──────────────────────────────────────────────────────────────────

@Serializable
data class Route(
    val id: String,
    @SerialName("fromCity") val fromCity: String,
    @SerialName("toCity") val toCity: String,
    @SerialName("distanceKm") val distanceKm: Int,
    @SerialName("estimatedDurationMinutes") val estimatedDurationMinutes: Int,
    val waypoints: String? = null,
    @SerialName("isActive") val isActive: Boolean? = null,
) {
    /** Convenience accessor matching the spec field name. */
    val origin: String get() = fromCity
    val destination: String get() = toCity
    val distance: Double get() = distanceKm.toDouble()
    val estimatedDuration: Int get() = estimatedDurationMinutes
}

// ─── Vehicles, Drivers, Operators ────────────────────────────────────────────

@Serializable
data class Vehicle(
    val id: String,
    @SerialName("registrationNumber") val registrationNumber: String,
    val capacity: Int,
    @SerialName("vehicleType") val vehicleType: String? = null,
    @SerialName("isWheelchairAccessible") val isWheelchairAccessible: Boolean? = null,
    @SerialName("isActive") val isActive: Boolean? = null,
)

@Serializable
data class Driver(
    val id: String,
    val name: String? = null,
    val phone: String? = null,
    @SerialName("licenceNumber") val licenceNumber: String? = null,
    val rating: Double? = null,
    @SerialName("totalTrips") val totalTrips: Int? = null,
)

@Serializable
data class Operator(
    val id: String,
    val name: String,
    @SerialName("rtsaLicenceNumber") val rtsaLicenceNumber: String? = null,
    @SerialName("contactPhone") val contactPhone: String? = null,
    @SerialName("complianceScore") val complianceScore: Double? = null,
)

// ─── Journeys ────────────────────────────────────────────────────────────────

@Serializable
data class Journey(
    val id: String,
    @SerialName("routeId") val routeId: String,
    val route: Route? = null,
    @SerialName("driverId") val driverId: String,
    val driver: Driver? = null,
    @SerialName("vehicleId") val vehicleId: String? = null,
    val vehicle: Vehicle? = null,
    @SerialName("operatorId") val operatorId: String,
    val operator: Operator? = null,
    @SerialName("departureTime") val departureTime: String,
    @SerialName("arrivalTime") val arrivalTime: String? = null,
    val status: String,
    @SerialName("availableSeats") val availableSeats: Int,
    @SerialName("totalSeats") val totalSeats: Int,
    val price: Double? = null,
    @SerialName("busRegistration") val busRegistration: String? = null,
    @SerialName("trackingToken") val trackingToken: String? = null,
)

// ─── Bookings ────────────────────────────────────────────────────────────────

@Serializable
data class Booking(
    val id: String,
    val reference: String,
    @SerialName("journeyId") val journeyId: String,
    val journey: Journey? = null,
    @SerialName("userId") val userId: String,
    @SerialName("seatNumber") val seatNumber: Int? = null,
    val status: String,
    val price: Double,
    @SerialName("paymentMethod") val paymentMethod: String? = null,
    @SerialName("paymentStatus") val paymentStatus: String,
    @SerialName("passengerName") val passengerName: String? = null,
    @SerialName("passengerPhone") val passengerPhone: String? = null,
    @SerialName("qrCode") val qrCode: String? = null,
    @SerialName("bookedVia") val bookedVia: String? = null,
    @SerialName("checkedInAt") val checkedInAt: String? = null,
    @SerialName("cancelledAt") val cancelledAt: String? = null,
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null,
)

@Serializable
data class BookingRequest(
    @SerialName("journeyId") val journeyId: String,
    @SerialName("seatNumber") val seatNumber: Int,
    @SerialName("paymentMethod") val paymentMethod: String,
    @SerialName("passengerName") val passengerName: String? = null,
    @SerialName("passengerPhone") val passengerPhone: String? = null,
)

@Serializable
data class SeatAvailability(
    @SerialName("seatNumber") val seatNumber: Int,
    @SerialName("isAvailable") val isAvailable: Boolean,
)

// ─── Ratings ─────────────────────────────────────────────────────────────────

@Serializable
data class RatingRequest(
    @SerialName("journeyId") val journeyId: String,
    @SerialName("driverId") val driverId: String,
    val score: Int,
    val comment: String? = null,
)

@Serializable
data class Rating(
    val id: String,
    val stars: Int? = null,
    val score: Int? = null,
    val comment: String? = null,
    @SerialName("createdAt") val createdAt: String? = null,
)

// ─── SOS ─────────────────────────────────────────────────────────────────────

@Serializable
data class SOSRequest(
    @SerialName("journeyId") val journeyId: String,
    val latitude: Double,
    val longitude: Double,
    val description: String? = null,
)

@Serializable
data class SOSResponse(
    val id: String,
    val status: String,
    val message: String? = null,
)

// ─── Tracking ────────────────────────────────────────────────────────────────

@Serializable
data class TrackingPosition(
    val latitude: Double,
    val longitude: Double,
    val speed: Double? = null,
    val heading: Double? = null,
    val timestamp: String? = null,
)

@Serializable
data class JourneyTracking(
    @SerialName("journeyId") val journeyId: String,
    val positions: List<TrackingPosition> = emptyList(),
    @SerialName("currentSpeed") val currentSpeed: Double? = null,
    val driver: Driver? = null,
    val vehicle: Vehicle? = null,
    val route: Route? = null,
    val eta: String? = null,
)

// ─── Payments ────────────────────────────────────────────────────────────────

@Serializable
data class PaymentInitRequest(
    @SerialName("bookingReference") val bookingReference: String,
    @SerialName("paymentMethod") val paymentMethod: String,
    @SerialName("phoneNumber") val phoneNumber: String,
)

@Serializable
data class PaymentStatusResponse(
    val status: String,
    @SerialName("transactionId") val transactionId: String? = null,
    val message: String? = null,
)

// ─── History ─────────────────────────────────────────────────────────────────

@Serializable
data class SpendingSummary(
    val thisMonth: Double = 0.0,
    val thisYear: Double = 0.0,
    val allTime: Double = 0.0,
)

@Serializable
data class HistoryResponse(
    val bookings: List<Booking> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
    val spending: SpendingSummary? = null,
)

// ─── Generic Wrappers ────────────────────────────────────────────────────────

@Serializable
data class ApiError(
    val code: String? = null,
    val message: String? = null,
)

/**
 * Generic wrapper matching the backend's standard envelope:
 * ```json
 * { "success": true/false, "data": ..., "error": { "code": "...", "message": "..." }, "message": "...", "timestamp": "..." }
 * ```
 */
@Serializable
data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T? = null,
    val error: ApiError? = null,
    val message: String? = null,
    val timestamp: String? = null,
)

@Serializable
data class PaginatedResponse<T>(
    val success: Boolean = true,
    val data: List<T> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
    val message: String? = null,
    val timestamp: String? = null,
)
