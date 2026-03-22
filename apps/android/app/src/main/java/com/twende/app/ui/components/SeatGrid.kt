package com.twende.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.twende.app.data.model.SeatAvailability
import com.twende.app.ui.theme.Gray200
import com.twende.app.ui.theme.Gray300
import com.twende.app.ui.theme.TextSecondary
import com.twende.app.ui.theme.TwendeTeal

@Composable
fun SeatGrid(
    seats: List<SeatAvailability>,
    selectedSeat: Int?,
    onSeatClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
    seatsPerRow: Int = 4,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Legend
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            LegendItem(color = TwendeTeal.copy(alpha = 0.15f), borderColor = TwendeTeal, label = "Available")
            LegendItem(color = TwendeTeal, borderColor = TwendeTeal, label = "Selected")
            LegendItem(color = Gray200, borderColor = Gray300, label = "Taken")
        }

        // Seat rows
        val rows = seats.chunked(seatsPerRow)
        rows.forEach { rowSeats ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                val leftSeats = rowSeats.take(seatsPerRow / 2)
                leftSeats.forEach { seat ->
                    SeatItem(
                        seat = seat,
                        isSelected = seat.seatNumber == selectedSeat,
                        onClick = { onSeatClick(seat.seatNumber) },
                    )
                }

                Spacer(modifier = Modifier.width(24.dp))

                val rightSeats = rowSeats.drop(seatsPerRow / 2)
                rightSeats.forEach { seat ->
                    SeatItem(
                        seat = seat,
                        isSelected = seat.seatNumber == selectedSeat,
                        onClick = { onSeatClick(seat.seatNumber) },
                    )
                }
                repeat(seatsPerRow - rowSeats.size) {
                    Spacer(modifier = Modifier.size(48.dp))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
private fun SeatItem(
    seat: SeatAvailability,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(8.dp)
    val bgColor = when {
        isSelected -> TwendeTeal
        seat.isAvailable -> TwendeTeal.copy(alpha = 0.1f)
        else -> Gray200
    }
    val borderColor = when {
        isSelected -> TwendeTeal
        seat.isAvailable -> TwendeTeal
        else -> Gray300
    }
    val textColor = when {
        isSelected -> Color.White
        seat.isAvailable -> TwendeTeal
        else -> TextSecondary
    }

    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(shape)
            .background(bgColor)
            .border(BorderStroke(1.5.dp, borderColor), shape)
            .then(
                if (seat.isAvailable) Modifier.clickable { onClick() }
                else Modifier
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = seat.seatNumber.toString(),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun LegendItem(
    color: Color,
    borderColor: Color,
    label: String,
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(16.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(color)
                .border(BorderStroke(1.dp, borderColor), RoundedCornerShape(4.dp)),
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary,
        )
    }
}
