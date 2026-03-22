package com.twende.app.ui.passenger.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.twende.app.ui.components.LoadingScreen
import com.twende.app.ui.components.SeatGrid
import com.twende.app.ui.components.TwendeButton
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.TextSecondary

private val AirtelRed = Color(0xFFED1C24)
private val MtnYellow = Color(0xFFFFCC00)
private val ZamtelGreen = Color(0xFF00A651)

data class PaymentOption(
    val id: String,
    val name: String,
    val color: Color,
)

private val paymentOptions = listOf(
    PaymentOption("AIRTEL_MONEY", "Airtel Money", AirtelRed),
    PaymentOption("MTN_MOMO", "MTN MoMo", MtnYellow),
    PaymentOption("ZAMTEL_KWACHA", "Zamtel Kwacha", ZamtelGreen),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SeatSelectionScreen(
    journeyId: String,
    onBookingSuccess: (String) -> Unit,
    onNavigateToPayment: (String, String) -> Unit,
    onBack: () -> Unit,
    viewModel: BookingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(journeyId) {
        viewModel.loadJourneyAndSeats(journeyId)
    }

    LaunchedEffect(uiState.bookingSuccess) {
        if (uiState.bookingSuccess) {
            uiState.booking?.let { booking ->
                onNavigateToPayment(booking.reference, uiState.selectedPaymentMethod)
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Your Seat") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        if (uiState.isLoading && uiState.seats.isEmpty()) {
            LoadingScreen()
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Journey info card
            uiState.journey?.let { journey ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            imageVector = Icons.Default.DirectionsBus,
                            contentDescription = null,
                            tint = TwendeTeal,
                            modifier = Modifier.size(32.dp),
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = journey.route?.let { "${it.origin} → ${it.destination}" }
                                    ?: "Journey",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                text = journey.departureTime,
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "K${journey.price ?: "—"}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = TwendeTeal,
                            )
                            Text(
                                text = "${journey.availableSeats} seats left",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Seat grid
            Text(
                text = "Choose a seat",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = TextSecondary,
            )

            Spacer(modifier = Modifier.height(12.dp))

            SeatGrid(
                seats = uiState.seats,
                selectedSeat = uiState.selectedSeat,
                onSeatClick = { viewModel.selectSeat(it) },
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Payment method selection
            Text(
                text = "Payment Method",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Medium,
                color = TextSecondary,
            )

            Spacer(modifier = Modifier.height(8.dp))

            paymentOptions.forEach { option ->
                val isSelected = uiState.selectedPaymentMethod == option.id
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clickable { viewModel.selectPaymentMethod(option.id) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSelected) TwendeTeal.copy(alpha = 0.06f) else Color.White,
                    ),
                    border = if (isSelected) {
                        androidx.compose.foundation.BorderStroke(1.5.dp, TwendeTeal)
                    } else {
                        null
                    },
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { viewModel.selectPaymentMethod(option.id) },
                            colors = RadioButtonDefaults.colors(selectedColor = TwendeTeal),
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            imageVector = Icons.Default.PhoneAndroid,
                            contentDescription = null,
                            tint = option.color,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = option.name,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = if (isSelected) FontWeight.Medium else FontWeight.Normal,
                        )
                    }
                }
            }

            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Book button
            val price = uiState.journey?.price?.let { "K$it" } ?: ""
            TwendeButton(
                text = if (uiState.selectedSeat != null) "Book Seat ${uiState.selectedSeat} — $price" else "Select a seat",
                onClick = { viewModel.createBooking(journeyId) },
                enabled = uiState.selectedSeat != null && !uiState.isBooking,
                isLoading = uiState.isBooking,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
