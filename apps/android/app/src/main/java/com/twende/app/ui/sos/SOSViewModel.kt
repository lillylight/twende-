package com.twende.app.ui.sos

import android.annotation.SuppressLint
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.twende.app.data.model.SOSResponse
import com.twende.app.data.repository.SOSRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class SOSUiState(
    val isSending: Boolean = false,
    val sosActive: Boolean = false,
    val sosResponse: SOSResponse? = null,
    val error: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)

@HiltViewModel
class SOSViewModel @Inject constructor(
    private val sosRepository: SOSRepository,
    private val fusedLocationClient: FusedLocationProviderClient,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SOSUiState())
    val uiState: StateFlow<SOSUiState> = _uiState.asStateFlow()

    init {
        fetchCurrentLocation()
    }

    @SuppressLint("MissingPermission")
    private fun fetchCurrentLocation() {
        viewModelScope.launch {
            try {
                val location = fusedLocationClient.lastLocation.await()
                location?.let {
                    _uiState.update { state ->
                        state.copy(latitude = it.latitude, longitude = it.longitude)
                    }
                }
            } catch (_: Exception) {
                // Location not critical for SOS trigger; will use defaults
            }
        }
    }

    fun triggerSOS(journeyId: String, description: String? = null) {
        val lat = _uiState.value.latitude ?: -15.3875 // Lusaka default
        val lng = _uiState.value.longitude ?: 28.3228

        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }

            sosRepository.triggerSOS(
                journeyId = journeyId,
                latitude = lat,
                longitude = lng,
                description = description,
            )
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            sosActive = true,
                            sosResponse = response,
                            error = null,
                        )
                    }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            error = throwable.message ?: "Failed to send SOS. Please try again.",
                        )
                    }
                }
        }
    }

    fun cancelSOS(journeyId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSending = true, error = null) }

            sosRepository.cancelSOS(journeyId)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            sosActive = false,
                            sosResponse = null,
                            error = null,
                        )
                    }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isSending = false,
                            error = throwable.message ?: "Failed to cancel SOS.",
                        )
                    }
                }
        }
    }
}
