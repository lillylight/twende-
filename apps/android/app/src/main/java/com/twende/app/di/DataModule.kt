package com.twende.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.twende.app.data.api.TwendeApi
import com.twende.app.data.local.TokenManager
import com.twende.app.data.repository.AuthRepository
import com.twende.app.data.repository.BookingRepository
import com.twende.app.data.repository.JourneyRepository
import com.twende.app.data.repository.RatingRepository
import com.twende.app.data.repository.SOSRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    private const val DATASTORE_NAME = "twende_prefs"

    @Provides
    @Singleton
    fun provideDataStore(
        @ApplicationContext context: Context,
    ): DataStore<Preferences> = PreferenceDataStoreFactory.create {
        context.preferencesDataStoreFile(DATASTORE_NAME)
    }

    @Provides
    @Singleton
    fun provideTokenManager(
        dataStore: DataStore<Preferences>,
    ): TokenManager = TokenManager(dataStore)

    @Provides
    @Singleton
    fun provideAuthRepository(
        api: TwendeApi,
        tokenManager: TokenManager,
    ): AuthRepository = AuthRepository(api, tokenManager)

    @Provides
    @Singleton
    fun provideJourneyRepository(
        api: TwendeApi,
    ): JourneyRepository = JourneyRepository(api)

    @Provides
    @Singleton
    fun provideBookingRepository(
        api: TwendeApi,
    ): BookingRepository = BookingRepository(api)

    @Provides
    @Singleton
    fun provideSOSRepository(
        api: TwendeApi,
    ): SOSRepository = SOSRepository(api)

    @Provides
    @Singleton
    fun provideRatingRepository(
        api: TwendeApi,
    ): RatingRepository = RatingRepository(api)

    @Provides
    @Singleton
    fun provideFusedLocationProviderClient(
        @ApplicationContext context: Context,
    ): FusedLocationProviderClient = LocationServices.getFusedLocationProviderClient(context)
}
