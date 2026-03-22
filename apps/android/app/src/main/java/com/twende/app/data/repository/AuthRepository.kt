package com.twende.app.data.repository

import com.twende.app.data.api.TwendeApi
import com.twende.app.data.local.TokenManager
import com.twende.app.data.model.AuthData
import com.twende.app.data.model.LoginRequest
import com.twende.app.data.model.OtpVerifyRequest
import com.twende.app.data.model.RegisterRequest
import com.twende.app.data.model.User
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: TwendeApi,
    private val tokenManager: TokenManager,
) {
    suspend fun login(phone: String, password: String): Result<AuthData> = runCatching {
        val response = api.login(LoginRequest(phone, password))
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                persistSession(body.data)
                body.data
            } else {
                throw Exception(body.error?.message ?: body.message ?: "Login failed")
            }
        } else {
            throw Exception("Login failed: ${response.code()}")
        }
    }

    suspend fun register(phone: String, password: String, name: String): Result<AuthData> = runCatching {
        val response = api.register(RegisterRequest(phone, password, name))
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                persistSession(body.data)
                body.data
            } else {
                throw Exception(body.error?.message ?: body.message ?: "Registration failed")
            }
        } else {
            throw Exception("Registration failed: ${response.code()}")
        }
    }

    suspend fun verifyOtp(phone: String, code: String): Result<AuthData> = runCatching {
        val response = api.verifyOtp(OtpVerifyRequest(phone, code))
        if (response.isSuccessful) {
            val body = response.body()!!
            if (body.success && body.data != null) {
                persistSession(body.data)
                body.data
            } else {
                throw Exception(body.error?.message ?: body.message ?: "OTP verification failed")
            }
        } else {
            throw Exception("OTP verification failed: ${response.code()}")
        }
    }

    suspend fun logout(): Result<Unit> = runCatching {
        try {
            api.logout()
        } catch (_: Exception) {
            // Best-effort server logout; always clear local state
        }
        tokenManager.clearAll()
    }

    fun isLoggedIn(): Flow<Boolean> = tokenManager.isLoggedInFlow

    fun getCurrentUser(): Flow<User?> = tokenManager.userFlow

    private suspend fun persistSession(authData: AuthData) {
        tokenManager.saveTokens(
            accessToken = authData.tokens.accessToken,
            refreshToken = authData.tokens.refreshToken,
        )
        tokenManager.saveUser(authData.user)
    }
}
