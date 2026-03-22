package com.twende.app.data.api

import com.twende.app.data.model.ApiResponse
import com.twende.app.data.model.AuthData
import com.twende.app.data.model.Booking
import com.twende.app.data.model.BookingRequest
import com.twende.app.data.model.HistoryResponse
import com.twende.app.data.model.JourneyTracking
import com.twende.app.data.model.LoginRequest
import com.twende.app.data.model.OtpVerifyRequest
import com.twende.app.data.model.PaymentInitRequest
import com.twende.app.data.model.PaymentStatusResponse
import com.twende.app.data.model.PaginatedResponse
import com.twende.app.data.model.Journey
import com.twende.app.data.model.Rating
import com.twende.app.data.model.RatingRequest
import com.twende.app.data.model.RefreshRequest
import com.twende.app.data.model.RegisterRequest
import com.twende.app.data.model.Route
import com.twende.app.data.model.SOSRequest
import com.twende.app.data.model.SOSResponse
import com.twende.app.data.model.SeatAvailability
import com.twende.app.data.model.TrackingPosition
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface TwendeApi {

    // ─── Auth ────────────────────────────────────────────────────────────────

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthData>>

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthData>>

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body request: OtpVerifyRequest): Response<ApiResponse<AuthData>>

    @POST("api/auth/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): Response<ApiResponse<AuthData>>

    @POST("api/auth/logout")
    suspend fun logout(): Response<ApiResponse<Unit>>

    // ─── Routes ──────────────────────────────────────────────────────────────

    @GET("api/routes")
    suspend fun getRoutes(
        @Query("page") page: Int? = null,
        @Query("pageSize") pageSize: Int? = null,
    ): Response<PaginatedResponse<Route>>

    // ─── Journeys ────────────────────────────────────────────────────────────

    @GET("api/journeys")
    suspend fun getJourneys(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("date") date: String? = null,
        @Query("status") status: String? = null,
        @Query("page") page: Int? = null,
        @Query("pageSize") pageSize: Int? = null,
    ): Response<PaginatedResponse<Journey>>

    @GET("api/journeys/{id}/seats")
    suspend fun getSeats(
        @Path("id") journeyId: String,
    ): Response<ApiResponse<List<SeatAvailability>>>

    // ─── Bookings ────────────────────────────────────────────────────────────

    @POST("api/bookings")
    suspend fun createBooking(@Body request: BookingRequest): Response<ApiResponse<Booking>>

    @GET("api/bookings")
    suspend fun getBookings(
        @Query("page") page: Int? = null,
        @Query("pageSize") pageSize: Int? = null,
        @Query("status") status: String? = null,
    ): Response<PaginatedResponse<Booking>>

    @GET("api/bookings/{reference}")
    suspend fun getBooking(
        @Path("reference") reference: String,
    ): Response<ApiResponse<Booking>>

    @DELETE("api/bookings/{reference}")
    suspend fun cancelBooking(
        @Path("reference") reference: String,
    ): Response<ApiResponse<Unit>>

    @POST("api/bookings/{reference}/check-in")
    suspend fun checkIn(
        @Path("reference") reference: String,
    ): Response<ApiResponse<Booking>>

    @GET("api/bookings/{reference}/receipt")
    suspend fun downloadReceipt(
        @Path("reference") reference: String,
    ): Response<ResponseBody>

    // ─── Payments ────────────────────────────────────────────────────────

    @POST("api/payments/initiate")
    suspend fun initiatePayment(@Body request: PaymentInitRequest): Response<ApiResponse<Unit>>

    @GET("api/payments/{reference}/status")
    suspend fun checkPaymentStatus(
        @Path("reference") reference: String,
    ): Response<ApiResponse<PaymentStatusResponse>>

    // ─── Journey History ─────────────────────────────────────────────────────

    @GET("api/journeys/history")
    suspend fun getHistory(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("status") status: String? = null,
    ): Response<ApiResponse<HistoryResponse>>

    // ─── Tracking ────────────────────────────────────────────────────────────

    @GET("api/tracking/journey/{id}")
    suspend fun getJourneyTracking(
        @Path("id") journeyId: String,
    ): Response<ApiResponse<JourneyTracking>>

    @GET("api/tracking/public/{token}")
    suspend fun getPublicTracking(
        @Path("token") token: String,
    ): Response<ApiResponse<JourneyTracking>>

    @POST("api/tracking/position")
    suspend fun sendPosition(@Body position: TrackingPosition): Response<ApiResponse<Unit>>

    // ─── SOS ─────────────────────────────────────────────────────────────────

    @POST("api/sos/{journeyId}")
    suspend fun triggerSOS(
        @Path("journeyId") journeyId: String,
        @Body request: SOSRequest,
    ): Response<ApiResponse<SOSResponse>>

    @DELETE("api/sos/{journeyId}")
    suspend fun cancelSOS(
        @Path("journeyId") journeyId: String,
    ): Response<ApiResponse<Unit>>

    // ─── Ratings ─────────────────────────────────────────────────────────────

    @POST("api/ratings")
    suspend fun submitRating(@Body request: RatingRequest): Response<ApiResponse<Rating>>

    @GET("api/drivers/{id}/rating")
    suspend fun getDriverRating(
        @Path("id") driverId: String,
    ): Response<ApiResponse<Double>>
}
