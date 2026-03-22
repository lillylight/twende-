package com.twende.app.ui.passenger.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.model.Booking
import com.twende.app.data.model.Journey
import com.twende.app.data.model.SeatAvailability
import com.twende.app.data.repository.BookingRepository
import com.twende.app.data.repository.JourneyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class BookingUiState(
    val journey: Journey? = null,
    val seats: List<SeatAvailability> = emptyList(),
    val selectedSeat: Int? = null,
    val selectedPaymentMethod: String = "AIRTEL_MONEY",
    val booking: Booking? = null,
    val bookings: List<Booking> = emptyList(),
    val activeTab: Int = 0,
    val isLoading: Boolean = false,
    val isBooking: Boolean = false,
    val isCancelling: Boolean = false,
    val isCheckingIn: Boolean = false,
    val error: String? = null,
    val bookingSuccess: Boolean = false,
    val cancelSuccess: Boolean = false,
    val checkInSuccess: Boolean = false,
)

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val journeyRepository: JourneyRepository,
    private val bookingRepository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(BookingUiState())
    val uiState: StateFlow<BookingUiState> = _uiState.asStateFlow()

    fun loadJourneyAndSeats(journeyId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            journeyRepository.searchJourneys(status = "SCHEDULED")
                .onSuccess { journeys ->
                    val journey = journeys.find { it.id == journeyId }
                    _uiState.update { it.copy(journey = journey) }
                }
            journeyRepository.getSeats(journeyId)
                .onSuccess { seats ->
                    _uiState.update { it.copy(isLoading = false, seats = seats) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun selectSeat(seatNumber: Int) {
        _uiState.update { it.copy(selectedSeat = seatNumber) }
    }

    fun selectPaymentMethod(method: String) {
        _uiState.update { it.copy(selectedPaymentMethod = method) }
    }

    fun createBooking(journeyId: String) {
        val state = _uiState.value
        val seat = state.selectedSeat ?: return

        viewModelScope.launch {
            _uiState.update { it.copy(isBooking = true, error = null) }
            bookingRepository.createBooking(
                journeyId = journeyId,
                seatNumber = seat,
                paymentMethod = state.selectedPaymentMethod,
            )
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(isBooking = false, booking = booking, bookingSuccess = true)
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isBooking = false, error = e.message) }
                }
        }
    }

    fun loadBookings(status: String? = null) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            bookingRepository.getBookings(status = status)
                .onSuccess { bookings ->
                    _uiState.update { it.copy(isLoading = false, bookings = bookings) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun loadBooking(reference: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            bookingRepository.getBooking(reference)
                .onSuccess { booking ->
                    _uiState.update { it.copy(isLoading = false, booking = booking) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
        }
    }

    fun cancelBooking(reference: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCancelling = true, error = null) }
            bookingRepository.cancelBooking(reference)
                .onSuccess {
                    _uiState.update { it.copy(isCancelling = false, cancelSuccess = true) }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isCancelling = false, error = e.message) }
                }
        }
    }

    fun checkIn(reference: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isCheckingIn = true, error = null) }
            bookingRepository.checkIn(reference)
                .onSuccess { booking ->
                    _uiState.update {
                        it.copy(isCheckingIn = false, booking = booking, checkInSuccess = true)
                    }
                }
                .onFailure { e ->
                    _uiState.update { it.copy(isCheckingIn = false, error = e.message) }
                }
        }
    }

    fun setActiveTab(tab: Int) {
        _uiState.update { it.copy(activeTab = tab) }
        val status = when (tab) {
            0 -> null
            1 -> "confirmed"
            2 -> "completed"
            3 -> "cancelled"
            else -> null
        }
        loadBookings(status)
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
