package com.twende.app.ui.passenger.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.model.Booking
import com.twende.app.data.model.SpendingSummary
import com.twende.app.data.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryUiState(
    val bookings: List<Booking> = emptyList(),
    val spending: SpendingSummary? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val page: Int = 1,
    val hasMore: Boolean = true,
    val total: Int = 0,
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState.asStateFlow()

    init {
        loadHistory()
    }

    fun loadHistory() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, page = 1) }
            bookingRepository.getHistory(page = 1, limit = 20)
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            bookings = response.bookings,
                            spending = response.spending,
                            total = response.total,
                            hasMore = response.bookings.size < response.total,
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun loadMore() {
        if (_uiState.value.isLoading || !_uiState.value.hasMore) return
        val nextPage = _uiState.value.page + 1

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            bookingRepository.getHistory(page = nextPage, limit = 20)
                .onSuccess { response ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            bookings = it.bookings + response.bookings,
                            page = nextPage,
                            hasMore = (it.bookings.size + response.bookings.size) < response.total,
                        )
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }
}
