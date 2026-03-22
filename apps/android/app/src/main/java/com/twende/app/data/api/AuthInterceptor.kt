package com.twende.app.data.api

import com.twende.app.data.local.TokenManager
import com.twende.app.data.model.RefreshRequest
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

/**
 * OkHttp interceptor that:
 * 1. Attaches the Bearer token to every request.
 * 2. On a 401 response, attempts a single token refresh and retries
 *    the original request with the new access token.
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenManager: TokenManager,
    private val json: Json,
) : Interceptor {

    @Volatile
    private var isRefreshing = false

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Skip auth header for auth endpoints
        if (originalRequest.isAuthEndpoint()) {
            return chain.proceed(originalRequest)
        }

        val accessToken = runBlocking { tokenManager.getAccessToken() }
        val authenticatedRequest = originalRequest.withBearerToken(accessToken)
        val response = chain.proceed(authenticatedRequest)

        // If not 401 or already refreshing, return as-is
        if (response.code != 401 || isRefreshing) {
            return response
        }

        // Attempt token refresh
        synchronized(this) {
            // Double-check: another thread may have already refreshed
            if (isRefreshing) {
                val newToken = runBlocking { tokenManager.getAccessToken() }
                response.close()
                return chain.proceed(originalRequest.withBearerToken(newToken))
            }

            isRefreshing = true
            try {
                val refreshToken = runBlocking { tokenManager.getRefreshToken() }
                    ?: return response // No refresh token, cannot recover

                val newTokens = attemptRefresh(chain, refreshToken)
                if (newTokens != null) {
                    runBlocking {
                        tokenManager.saveTokens(
                            accessToken = newTokens.first,
                            refreshToken = newTokens.second,
                        )
                    }
                    // Retry original request with new token
                    response.close()
                    return chain.proceed(originalRequest.withBearerToken(newTokens.first))
                }

                // Refresh failed — clear session so the UI can redirect to login
                runBlocking { tokenManager.clearAll() }
                return response
            } finally {
                isRefreshing = false
            }
        }
    }

    /**
     * Performs the refresh-token call using a bare OkHttpClient (no interceptors)
     * to avoid recursion.
     *
     * Returns (newAccessToken, newRefreshToken) on success, or null on failure.
     */
    private fun attemptRefresh(
        chain: Interceptor.Chain,
        refreshToken: String,
    ): Pair<String, String>? {
        return try {
            val body = json.encodeToString(
                RefreshRequest.serializer(),
                RefreshRequest(refreshToken = refreshToken),
            )
            val mediaType = "application/json; charset=utf-8".toMediaType()

            val refreshRequest = Request.Builder()
                .url(
                    chain.request().url.newBuilder()
                        .encodedPath("/api/auth/refresh")
                        .build()
                )
                .post(body.toRequestBody(mediaType))
                .build()

            val refreshResponse = chain.proceed(refreshRequest)
            if (!refreshResponse.isSuccessful) {
                refreshResponse.close()
                return null
            }

            val responseBody = refreshResponse.body?.string() ?: return null
            refreshResponse.close()

            // Parse using a lenient json instance to handle unexpected fields
            val parsed = json.decodeFromString(
                com.twende.app.data.model.ApiResponse.serializer(
                    com.twende.app.data.model.AuthData.serializer()
                ),
                responseBody,
            )

            val authData = parsed.data ?: return null
            Pair(authData.tokens.accessToken, authData.tokens.refreshToken)
        } catch (e: Exception) {
            null
        }
    }

    private fun Request.isAuthEndpoint(): Boolean {
        val path = url.encodedPath
        return path.contains("/auth/login") ||
                path.contains("/auth/register") ||
                path.contains("/auth/refresh") ||
                path.contains("/auth/verify-otp")
    }

    private fun Request.withBearerToken(token: String?): Request {
        if (token.isNullOrBlank()) return this
        return newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
    }
}
