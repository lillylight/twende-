package com.twende.app.data.repository

import com.twende.app.data.api.TwendeApi
import com.twende.app.data.model.SOSRequest
import com.twende.app.data.model.SOSResponse
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SOSRepository @Inject constructor(
    private val api: TwendeApi,
) {
    suspend fun triggerSOS(
        journeyId: String,
        latitude: Double,
        longitude: Double,
        description: String? = null,
    ): Result<SOSResponse> = runCatching {
        val response = api.triggerSOS(
            journeyId = journeyId,
            request = SOSRequest(
                journeyId = journeyId,
                latitude = latitude,
                longitude = longitude,
                description = description,
            ),
        )
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                body.data
            } else {
                throw Exception(body.error?.message ?: "SOS failed")
            }
        } else {
            throw Exception("SOS failed: ${response.code()}")
        }
    }

    suspend fun cancelSOS(journeyId: String): Result<Unit> = runCatching {
        val response = api.cancelSOS(journeyId)
        if (!response.isSuccessful) {
            throw Exception("Cancel SOS failed: ${response.code()}")
        }
    }
}
