package com.twende.app.ui.ratings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.twende.app.data.repository.RatingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RatingUiState(
    val score: Int = 0,
    val comment: String = "",
    val isSubmitting: Boolean = false,
    val submitted: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class RatingViewModel @Inject constructor(
    private val ratingRepository: RatingRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(RatingUiState())
    val uiState: StateFlow<RatingUiState> = _uiState.asStateFlow()

    fun setScore(score: Int) {
        _uiState.update { it.copy(score = score.coerceIn(1, 5)) }
    }

    fun setComment(comment: String) {
        _uiState.update { it.copy(comment = comment) }
    }

    fun submitRating(journeyId: String, driverId: String) {
        val state = _uiState.value
        if (state.score == 0) return

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true, error = null) }

            ratingRepository.submitRating(
                journeyId = journeyId,
                driverId = driverId,
                score = state.score,
                comment = state.comment.ifBlank { null },
            )
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            submitted = true,
                            error = null,
                        )
                    }
                }
                .onFailure { throwable ->
                    _uiState.update {
                        it.copy(
                            isSubmitting = false,
                            error = throwable.message ?: "Failed to submit rating. Please try again.",
                        )
                    }
                }
        }
    }
}
