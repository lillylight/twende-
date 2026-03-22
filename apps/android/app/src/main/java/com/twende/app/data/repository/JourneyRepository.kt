package com.twende.app.data.repository

import com.twende.app.data.api.TwendeApi
import com.twende.app.data.model.Journey
import com.twende.app.data.model.JourneyTracking
import com.twende.app.data.model.Route
import com.twende.app.data.model.SeatAvailability
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class JourneyRepository @Inject constructor(
    private val api: TwendeApi,
) {
    suspend fun getRoutes(): Result<List<Route>> = runCatching {
        val response = api.getRoutes()
        if (response.isSuccessful) {
            response.body()?.data ?: emptyList()
        } else {
            throw Exception("Failed to load routes: ${response.code()}")
        }
    }

    suspend fun searchJourneys(
        routeId: String? = null,
        from: String? = null,
        to: String? = null,
        date: String? = null,
        status: String? = null,
        page: Int? = null,
        pageSize: Int? = null,
    ): Result<List<Journey>> = runCatching {
        val response = api.getJourneys(
            from = from,
            to = to,
            date = date,
            status = status,
            page = page,
            pageSize = pageSize,
        )
        if (response.isSuccessful) {
            val journeys = response.body()?.data ?: emptyList()
            if (routeId != null) {
                journeys.filter { it.routeId == routeId }
            } else {
                journeys
            }
        } else {
            throw Exception("Failed to search journeys: ${response.code()}")
        }
    }

    suspend fun getSeats(journeyId: String): Result<List<SeatAvailability>> = runCatching {
        val response = api.getSeats(journeyId)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to load seats")
            }
        } else {
            throw Exception("Failed to load seats: ${response.code()}")
        }
    }

    suspend fun getJourneyTracking(journeyId: String): Result<JourneyTracking> = runCatching {
        val response = api.getJourneyTracking(journeyId)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to load tracking data")
            }
        } else {
            throw Exception("Failed to load tracking data: ${response.code()}")
        }
    }

    suspend fun getPublicTracking(token: String): Result<JourneyTracking> = runCatching {
        val response = api.getPublicTracking(token)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to load tracking data")
            }
        } else {
            throw Exception("Failed to load tracking data: ${response.code()}")
        }
    }
}
