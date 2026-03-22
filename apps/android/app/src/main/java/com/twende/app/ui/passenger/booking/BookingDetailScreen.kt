package com.twende.app.ui.passenger.booking

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.twende.app.ui.components.LoadingScreen
import com.twende.app.ui.components.StatusBadge
import com.twende.app.ui.components.TwendeButton
import com.twende.app.ui.theme.TwendeRed
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.TextSecondary

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingDetailScreen(
    reference: String,
    onBack: () -> Unit,
    onTrackJourney: (String) -> Unit,
    onRateJourney: (String, String) -> Unit,
    viewModel: BookingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showCancelDialog by remember { mutableStateOf(false) }

    LaunchedEffect(reference) {
        viewModel.loadBooking(reference)
    }

    LaunchedEffect(uiState.cancelSuccess) {
        if (uiState.cancelSuccess) onBack()
    }

    if (showCancelDialog) {
        AlertDialog(
            onDismissRequest = { showCancelDialog = false },
            title = { Text("Cancel Booking?") },
            text = { Text("Are you sure you want to cancel this booking? This action cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    showCancelDialog = false
                    viewModel.cancelBooking(reference)
                }) {
                    Text("Cancel Booking", color = TwendeRed)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCancelDialog = false }) {
                    Text("Keep Booking")
                }
            },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Booking Details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        if (uiState.isLoading && uiState.booking == null) {
            LoadingScreen()
            return@Scaffold
        }

        val booking = uiState.booking ?: return@Scaffold

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Reference and status
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            text = booking.reference,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                            color = TwendeTeal,
                        )
                        StatusBadge(status = booking.status)
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    InfoRow("Route", booking.journey?.route?.let { "${it.origin} → ${it.destination}" } ?: "—")
                    InfoRow("Departure", booking.journey?.departureTime ?: "—")
                    InfoRow("Seat", booking.seatNumber?.toString() ?: "—")
                    InfoRow("Operator", booking.journey?.operator?.name ?: "—")
                    InfoRow("Vehicle", booking.journey?.vehicle?.registrationNumber ?: "—")

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(12.dp))

                    InfoRow("Payment Method", booking.paymentMethod?.replace("_", " ") ?: "—")
                    InfoRow("Amount", "K${booking.price}")
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Payment Status", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        StatusBadge(status = booking.paymentStatus)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Action buttons based on status
            val status = booking.status.lowercase()

            if (status in listOf("confirmed", "reserved")) {
                TwendeButton(
                    text = if (uiState.isCheckingIn) "Checking In..." else "Check In",
                    onClick = { viewModel.checkIn(reference) },
                    isLoading = uiState.isCheckingIn,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(modifier = Modifier.height(12.dp))

                TwendeButton(
                    text = "Cancel Booking",
                    onClick = { showCancelDialog = true },
                    isLoading = uiState.isCancelling,
                    secondary = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (status == "checked_in") {
                TwendeButton(
                    text = "Track Journey",
                    onClick = { onTrackJourney(booking.journeyId) },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (status == "completed") {
                TwendeButton(
                    text = "Rate Journey",
                    onClick = {
                        onRateJourney(
                            booking.journeyId,
                            booking.journey?.driverId ?: "",
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
        Text(text = value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
