package com.twende.app.ui.payments

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.model.Booking
import com.twende.app.data.repository.BookingRepository
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

enum class PaymentStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
}

data class PaymentUiState(
    val paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    val booking: Booking? = null,
    val error: String? = null,
    val remainingSeconds: Int = 300, // 5 minute timeout
)

@HiltViewModel
class PaymentViewModel @Inject constructor(
    private val bookingRepository: BookingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentUiState())
    val uiState: StateFlow<PaymentUiState> = _uiState.asStateFlow()

    private var pollingJob: Job? = null
    private var countdownJob: Job? = null

    companion object {
        private const val POLL_INTERVAL_MS = 3_000L
        private const val TIMEOUT_SECONDS = 300
    }

    fun loadBooking(reference: String) {
        viewModelScope.launch {
            bookingRepository.getBooking(reference)
                .onSuccess { booking ->
                    _uiState.update { it.copy(booking = booking) }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(error = throwable.message ?: "Failed to load booking")
                    }
                }
        }
    }

    fun initiatePayment(reference: String, method: String, phone: String) {
        pollingJob?.cancel()
        countdownJob?.cancel()

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    paymentStatus = PaymentStatus.PROCESSING,
                    error = null,
                    remainingSeconds = TIMEOUT_SECONDS,
                )
            }

            bookingRepository.initiatePayment(reference, method, phone)
                .onSuccess {
                    startPolling(reference)
                    startCountdown()
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            paymentStatus = PaymentStatus.FAILED,
                            error = throwable.message ?: "Failed to initiate payment",
                        )
                    }
                }
        }
    }

    fun checkStatus(reference: String) {
        viewModelScope.launch {
            bookingRepository.checkPaymentStatus(reference)
                .onSuccess { response ->
                    when (response.status.uppercase()) {
                        "PAID", "SUCCESS", "COMPLETED" -> {
                            pollingJob?.cancel()
                            countdownJob?.cancel()
                            _uiState.update {
                                it.copy(paymentStatus = PaymentStatus.SUCCESS, error = null)
                            }
                        }
                        "FAILED", "CANCELLED", "REJECTED" -> {
                            pollingJob?.cancel()
                            countdownJob?.cancel()
                            _uiState.update {
                                it.copy(
                                    paymentStatus = PaymentStatus.FAILED,
                                    error = response.message ?: "Payment failed",
                                )
                            }
                        }
                        // Still processing — continue polling
                    }
                }
                .onFailure { /* Continue polling on transient errors */ }
        }
    }

    fun retryPayment() {
        _uiState.update {
            it.copy(
                paymentStatus = PaymentStatus.PENDING,
                error = null,
                remainingSeconds = TIMEOUT_SECONDS,
            )
        }
    }

    private fun startPolling(reference: String) {
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(POLL_INTERVAL_MS)
                checkStatus(reference)
            }
        }
    }

    private fun startCountdown() {
        countdownJob = viewModelScope.launch {
            var remaining = TIMEOUT_SECONDS
            while (isActive && remaining > 0) {
                delay(1_000L)
                remaining--
                _uiState.update { it.copy(remainingSeconds = remaining) }
            }
            if (remaining <= 0 && _uiState.value.paymentStatus == PaymentStatus.PROCESSING) {
                pollingJob?.cancel()
                _uiState.update {
                    it.copy(
                        paymentStatus = PaymentStatus.FAILED,
                        error = "Payment timed out. Please try again.",
                    )
                }
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
        pollingJob?.cancel()
        countdownJob?.cancel()
    }
}
