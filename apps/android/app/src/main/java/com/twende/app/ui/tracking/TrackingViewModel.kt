package com.twende.app.ui.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.model.JourneyTracking
import com.twende.app.data.repository.JourneyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TrackingUiState(
    val tracking: JourneyTracking? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class TrackingViewModel @Inject constructor(
    private val journeyRepository: JourneyRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(TrackingUiState())
    val uiState: StateFlow<TrackingUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private var currentJourneyId: String? = null

    companion object {
        private const val POLL_INTERVAL_MS = 5_000L
    }

    fun startTracking(journeyId: String) {
        currentJourneyId = journeyId
        pollingJob?.cancel()

        _uiState.update { it.copy(isLoading = true, error = null) }

        pollingJob = viewModelScope.launch {
            // Initial fetch
            fetchTracking(journeyId, isInitial = true)

            // Poll every 5 seconds
            while (isActive) {
                delay(POLL_INTERVAL_MS)
                fetchTracking(journeyId, isInitial = false)
            }
        }
    }

    fun stopTracking() {
        pollingJob?.cancel()
        pollingJob = null
        currentJourneyId = null
    }

    fun refresh() {
        val journeyId = currentJourneyId ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true) }
            fetchTracking(journeyId, isInitial = false)
            _uiState.update { it.copy(isRefreshing = false) }
        }
    }

    private suspend fun fetchTracking(journeyId: String, isInitial: Boolean) {
        journeyRepository.getJourneyTracking(journeyId)
            .onSuccess { tracking ->
                _uiState.update {
                    it.copy(
                        tracking = tracking,
                        isLoading = false,
                        error = null,
                    )
                }
            }
            .onFailure { throwable ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = if (isInitial) {
                            throwable.message ?: "Failed to load tracking data"
                        } else {
                            it.error
                        },
                    )
                }
            }
    }

    override fun onCleared() {
        super.onCleared()
        stopTracking()
    }
}
