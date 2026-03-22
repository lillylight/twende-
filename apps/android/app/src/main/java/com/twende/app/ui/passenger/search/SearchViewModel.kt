package com.twende.app.ui.passenger.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.model.Booking
import com.twende.app.data.model.Journey
import com.twende.app.data.model.Route
import com.twende.app.data.model.User
import com.twende.app.data.local.TokenManager
import com.twende.app.data.repository.BookingRepository
import com.twende.app.data.repository.JourneyRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val user: User? = null,
    val routes: List<Route> = emptyList(),
    val selectedRoute: Route? = null,
    val selectedDate: String = "",
    val journeys: List<Journey> = emptyList(),
    val recentBookings: List<Booking> = emptyList(),
    val upcomingTripsCount: Int = 0,
    val isLoadingRoutes: Boolean = false,
    val isLoadingJourneys: Boolean = false,
    val isLoadingBookings: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val journeyRepository: JourneyRepository,
    private val bookingRepository: BookingRepository,
    private val tokenManager: TokenManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    init {
        loadUser()
        loadRoutes()
        loadRecentBookings()
    }

    private fun loadUser() {
        viewModelScope.launch {
            val user = tokenManager.getUser()
            _uiState.update { it.copy(user = user) }
        }
    }

    fun loadRoutes() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingRoutes = true, error = null) }
            journeyRepository.getRoutes()
                .onSuccess { routes ->
                    _uiState.update { it.copy(isLoadingRoutes = false, routes = routes) }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isLoadingRoutes = false,
                            error = throwable.message ?: "Failed to load routes",
                        )
                    }
                }
        }
    }

    fun loadRecentBookings() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingBookings = true) }
            bookingRepository.getBookings(page = 1, pageSize = 5)
                .onSuccess { bookings ->
                    val upcoming = bookings.count { it.status in listOf("confirmed", "reserved") }
                    _uiState.update {
                        it.copy(
                            isLoadingBookings = false,
                            recentBookings = bookings,
                            upcomingTripsCount = upcoming,
                        )
                    }
                }
                .onFailure {
                    _uiState.update { it.copy(isLoadingBookings = false) }
                }
        }
    }

    fun selectRoute(route: Route) {
        _uiState.update { it.copy(selectedRoute = route) }
    }

    fun selectDate(date: String) {
        _uiState.update { it.copy(selectedDate = date) }
    }

    fun searchJourneys(routeId: String, date: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingJourneys = true, error = null) }
            journeyRepository.searchJourneys(routeId = routeId, date = date)
                .onSuccess { journeys ->
                    _uiState.update { it.copy(isLoadingJourneys = false, journeys = journeys) }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isLoadingJourneys = false,
                            error = throwable.message ?: "Failed to search journeys",
                        )
                    }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
