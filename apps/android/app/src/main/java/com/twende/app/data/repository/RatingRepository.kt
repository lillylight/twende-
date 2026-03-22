package com.twende.app.data.repository

import com.twende.app.data.api.TwendeApi
import com.twende.app.data.model.Rating
import com.twende.app.data.model.RatingRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RatingRepository @Inject constructor(
    private val api: TwendeApi,
) {
    suspend fun submitRating(
        journeyId: String,
        driverId: String,
        score: Int,
        comment: String? = null,
    ): Result<Rating> = runCatching {
        val response = api.submitRating(
            RatingRequest(
                journeyId = journeyId,
                driverId = driverId,
                score = score,
                comment = comment,
            )
        )
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Rating submission failed")
            }
        } else {
            throw Exception("Rating submission failed: ${response.code()}")
        }
    }

    suspend fun getDriverRating(driverId: String): Result<Double> = runCatching {
        val response = api.getDriverRating(driverId)
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "Failed to load driver rating")
            }
        } else {
            throw Exception("Failed to load driver rating: ${response.code()}")
        }
    }
}
