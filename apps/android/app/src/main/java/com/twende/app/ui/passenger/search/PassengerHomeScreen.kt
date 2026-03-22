package com.twende.app.ui.passenger.search

import android.app.DatePickerDialog
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import com.twende.app.data.model.Booking
import com.twende.app.data.model.Journey
import com.twende.app.ui.components.BottomNavBar
import com.twende.app.ui.components.StatusBadge
import com.twende.app.ui.components.TwendeButton
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.TextSecondary
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Calendar

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PassengerHomeScreen(
    navController: NavController,
    onJourneyClick: (String) -> Unit,
    onBookingClick: (String) -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var routeDropdownExpanded by remember { mutableStateOf(false) }

    Scaffold(
        bottomBar = { BottomNavBar(navController = navController) },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState()),
        ) {
            // Header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(TwendeTeal)
                    .padding(horizontal = 24.dp, vertical = 32.dp),
            ) {
                Column {
                    Text(
                        text = "Hello, ${uiState.user?.name ?: uiState.user?.firstName ?: "Traveller"}",
                        style = MaterialTheme.typography.headlineSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = if (uiState.upcomingTripsCount > 0) {
                            "${uiState.upcomingTripsCount} upcoming trip${if (uiState.upcomingTripsCount > 1) "s" else ""}"
                        } else {
                            "Where are you going today?"
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.85f),
                    )
                }
            }

            // Search card
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .padding(top = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Search Journeys",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Route dropdown
                    ExposedDropdownMenuBox(
                        expanded = routeDropdownExpanded,
                        onExpandedChange = { routeDropdownExpanded = it },
                    ) {
                        OutlinedTextField(
                            value = uiState.selectedRoute?.let { "${it.origin} → ${it.destination}" } ?: "",
                            onValueChange = {},
                            readOnly = true,
                            label = { Text("Route") },
                            leadingIcon = {
                                Icon(
                                    imageVector = Icons.Default.DirectionsBus,
                                    contentDescription = null,
                                    tint = TwendeTeal,
                                )
                            },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = routeDropdownExpanded) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = TwendeTeal,
                                focusedLabelColor = TwendeTeal,
                            ),
                        )

                        ExposedDropdownMenu(
                            expanded = routeDropdownExpanded,
                            onDismissRequest = { routeDropdownExpanded = false },
                        ) {
                            uiState.routes.forEach { route ->
                                DropdownMenuItem(
                                    text = { Text("${route.origin} → ${route.destination}") },
                                    onClick = {
                                        viewModel.selectRoute(route)
                                        routeDropdownExpanded = false
                                    },
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Date picker
                    OutlinedTextField(
                        value = uiState.selectedDate,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Date") },
                        leadingIcon = {
                            Icon(Icons.Default.CalendarToday, contentDescription = null, tint = TwendeTeal)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = TwendeTeal,
                            focusedLabelColor = TwendeTeal,
                        ),
                        interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() }.also {
                            // Open date picker on click
                        },
                        trailingIcon = {
                            IconButton(onClick = {
                                val cal = Calendar.getInstance()
                                DatePickerDialog(
                                    context,
                                    { _, year, month, day ->
                                        val date = LocalDate.of(year, month + 1, day)
                                        viewModel.selectDate(date.format(DateTimeFormatter.ISO_LOCAL_DATE))
                                    },
                                    cal.get(Calendar.YEAR),
                                    cal.get(Calendar.MONTH),
                                    cal.get(Calendar.DAY_OF_MONTH),
                                ).show()
                            }) {
                                Icon(Icons.Default.CalendarToday, contentDescription = "Pick date", tint = TwendeTeal)
                            }
                        },
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    TwendeButton(
                        text = "Search",
                        onClick = {
                            uiState.selectedRoute?.let { route ->
                                viewModel.searchJourneys(route.id, uiState.selectedDate)
                            }
                        },
                        enabled = uiState.selectedRoute != null && uiState.selectedDate.isNotBlank() && !uiState.isLoadingJourneys,
                        isLoading = uiState.isLoadingJourneys,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }

            // Journey results
            if (uiState.journeys.isNotEmpty()) {
                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Available Journeys",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )

                Spacer(modifier = Modifier.height(8.dp))

                uiState.journeys.forEach { journey ->
                    JourneyCard(
                        journey = journey,
                        onClick = { onJourneyClick(journey.id) },
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                }
            }

            // Recent bookings
            if (uiState.recentBookings.isNotEmpty()) {
                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Recent Bookings",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    uiState.recentBookings.forEach { booking ->
                        RecentBookingCard(
                            booking = booking,
                            onClick = { onBookingClick(booking.reference) },
                        )
                    }
                }
            }

            // Error
            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = uiState.error!!,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun JourneyCard(
    journey: Journey,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
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
                    text = journey.route?.let { "${it.origin} → ${it.destination}" } ?: "Journey",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    text = "${journey.departureTime} • ${journey.operator?.name ?: ""}",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary,
                )
                Text(
                    text = "${journey.availableSeats} seats left",
                    style = MaterialTheme.typography.bodySmall,
                    color = if ((journey.availableSeats) < 5) MaterialTheme.colorScheme.error else TextSecondary,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "K${journey.price ?: "—"}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = TwendeTeal,
                )
            }
        }
    }
}

@Composable
private fun RecentBookingCard(
    booking: Booking,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier
            .width(220.dp)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.Default.ConfirmationNumber,
                    contentDescription = null,
                    tint = TwendeTeal,
                    modifier = Modifier.size(20.dp),
                )
                StatusBadge(status = booking.status)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = booking.journey?.route?.let { "${it.origin} → ${it.destination}" } ?: booking.reference,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
            )
            Text(
                text = "Ref: ${booking.reference}",
                style = MaterialTheme.typography.bodySmall,
                color = TextSecondary,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "K${booking.price}",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = TwendeTeal,
            )
        }
    }
}
