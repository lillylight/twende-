package com.twende.app.data.repository

import com.twende.app.data.api.TwendeApi
import com.twende.app.data.model.Booking
import com.twende.app.data.model.BookingRequest
import com.twende.app.data.model.HistoryResponse
import com.twende.app.data.model.PaymentInitRequest
import com.twende.app.data.model.PaymentStatusResponse
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepository @Inject constructor(
    private val api: TwendeApi,
) {
    suspend fun createBooking(
        journeyId: String,
        seatNumber: Int,
        paymentMethod: String,
        passengerName: String? = null,
        passengerPhone: String? = null,
    ): Result<Booking> = runCatching {
        val response = api.createBooking(
            BookingRequest(
                journeyId = journeyId,
                seatNumber = seatNumber,
                paymentMethod = paymentMethod,
                passengerName = passengerName,
                passengerPhone = passengerPhone,
            )
        )
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: body.message ?: "Booking failed")
            }
        } else {
            throw Exception("Booking failed: ${response.code()}")
        }
    }

    suspend fun getBookings(
        status: String? = null,
        page: Int? = null,
        pageSize: Int? = null,
    ): Result<List<Booking>> = runCatching {
        val response = api.getBookings(page = page, pageSize = pageSize, status = status)
        if (response.isSuccessful) {
            response.body()?.data ?: emptyList()
        } else {
            throw Exception("Failed to load bookings: ${response.code()}")
        }
    }

    suspend fun getBooking(reference: String): Result<Booking> = runCatching {
        val response = api.getBooking(reference)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Booking not found")
            }
        } else {
            throw Exception("Failed to load booking: ${response.code()}")
        }
    }

    suspend fun cancelBooking(reference: String): Result<Unit> = runCatching {
        val response = api.cancelBooking(reference)
        if (!response.isSuccessful) {
            throw Exception("Failed to cancel booking: ${response.code()}")
        }
    }

    suspend fun checkIn(reference: String): Result<Booking> = runCatching {
        val response = api.checkIn(reference)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Check-in failed")
            }
        } else {
            throw Exception("Check-in failed: ${response.code()}")
        }
    }

    suspend fun downloadReceipt(reference: String): Result<ByteArray> = runCatching {
        val response = api.downloadReceipt(reference)
        if (response.isSuccessful) {
            response.body()?.bytes() ?: throw Exception("Empty receipt response")
        } else {
            throw Exception("Failed to download receipt: ${response.code()}")
        }
    }

    suspend fun initiatePayment(
        reference: String,
        method: String,
        phone: String,
    ): Result<Unit> = runCatching {
        // Payment initiation is handled by the booking creation flow;
        // this triggers a push notification to the user's phone via the API
        val response = api.initiatePayment(PaymentInitRequest(reference, method, phone))
        if (!response.isSuccessful) {
            throw Exception("Failed to initiate payment: ${response.code()}")
        }
    }

    suspend fun checkPaymentStatus(reference: String): Result<PaymentStatusResponse> = runCatching {
        val response = api.checkPaymentStatus(reference)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to check payment status")
            }
        } else {
            throw Exception("Failed to check payment status: ${response.code()}")
        }
    }

    suspend fun getHistory(
        page: Int? = null,
        limit: Int? = null,
        from: String? = null,
        to: String? = null,
        status: String? = null,
    ): Result<HistoryResponse> = runCatching {
        val response = api.getHistory(page = page, limit = limit, from = from, to = to, status = status)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to load history")
            }
        } else {
            throw Exception("Failed to load history: ${response.code()}")
        }
    }
}
