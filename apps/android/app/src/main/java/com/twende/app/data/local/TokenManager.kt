package com.twende.app.data.local

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.twende.app.data.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TokenManager @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    companion object {
        private val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        private val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        private val KEY_USER_ID = stringPreferencesKey("user_id")
        private val KEY_USER_NAME = stringPreferencesKey("user_name")
        private val KEY_USER_PHONE = stringPreferencesKey("user_phone")
        private val KEY_USER_ROLE = stringPreferencesKey("user_role")
        private val KEY_USER_EMAIL = stringPreferencesKey("user_email")
    }

    // ─── Write ───────────────────────────────────────────────────────────────

    suspend fun saveTokens(accessToken: String, refreshToken: String) {
        dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = accessToken
            prefs[KEY_REFRESH_TOKEN] = refreshToken
        }
    }

    suspend fun saveUser(user: User) {
        dataStore.edit { prefs ->
            prefs[KEY_USER_ID] = user.id
            prefs[KEY_USER_NAME] = user.name ?: "${user.firstName.orEmpty()} ${user.lastName.orEmpty()}".trim()
            prefs[KEY_USER_PHONE] = user.phone
            prefs[KEY_USER_ROLE] = user.role
            user.email?.let { prefs[KEY_USER_EMAIL] = it }
        }
    }

    suspend fun clearAll() {
        dataStore.edit { it.clear() }
    }

    // ─── Suspend readers ─────────────────────────────────────────────────────

    suspend fun getAccessToken(): String? =
        dataStore.data.first()[KEY_ACCESS_TOKEN]

    suspend fun getRefreshToken(): String? =
        dataStore.data.first()[KEY_REFRESH_TOKEN]

    suspend fun getUser(): User? {
        val prefs = dataStore.data.first()
        val id = prefs[KEY_USER_ID] ?: return null
        return User(
            id = id,
            name = prefs[KEY_USER_NAME],
            phone = prefs[KEY_USER_PHONE] ?: "",
            role = prefs[KEY_USER_ROLE] ?: "PASSENGER",
            email = prefs[KEY_USER_EMAIL],
        )
    }

    // ─── Flow-based reactive readers ─────────────────────────────────────────

    val accessTokenFlow: Flow<String?> = dataStore.data.map { it[KEY_ACCESS_TOKEN] }

    val isLoggedInFlow: Flow<Boolean> = dataStore.data.map { prefs ->
        !prefs[KEY_ACCESS_TOKEN].isNullOrBlank()
    }

    val userFlow: Flow<User?> = dataStore.data.map { prefs ->
        val id = prefs[KEY_USER_ID] ?: return@map null
        User(
            id = id,
            name = prefs[KEY_USER_NAME],
            phone = prefs[KEY_USER_PHONE] ?: "",
            role = prefs[KEY_USER_ROLE] ?: "PASSENGER",
            email = prefs[KEY_USER_EMAIL],
        )
    }
}
