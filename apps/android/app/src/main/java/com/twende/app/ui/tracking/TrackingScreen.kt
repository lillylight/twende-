package com.twende.app.ui.tracking

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DirectionsBus
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.BottomSheetScaffold
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SheetValue
import androidx.compose.material3.SmallFloatingActionButton
import androidx.compose.material3.Text
import androidx.compose.material3.rememberBottomSheetScaffoldState
import androidx.compose.material3.rememberStandardBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.Polyline
import com.google.maps.android.compose.rememberCameraPositionState
import com.twende.app.ui.theme.TwendeAmber
import com.twende.app.ui.theme.TwendeGreen
import com.twende.app.ui.theme.TwendeRed
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.TextSecondary

private val LUSAKA_DEFAULT = LatLng(-15.3875, 28.3228)
private const val DEFAULT_ZOOM = 12f

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TrackingScreen(
    journeyId: String,
    onNavigateToSOS: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: TrackingViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(journeyId) {
        viewModel.startTracking(journeyId)
    }

    DisposableEffect(Unit) {
        onDispose { viewModel.stopTracking() }
    }

    val tracking = uiState.tracking
    val currentPosition = tracking?.positions?.lastOrNull()?.let {
        LatLng(it.latitude, it.longitude)
    }

    val cameraPositionState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(
            currentPosition ?: LUSAKA_DEFAULT,
            DEFAULT_ZOOM,
        )
    }

    // Auto-center on bus position
    LaunchedEffect(currentPosition) {
        currentPosition?.let {
            cameraPositionState.animate(CameraUpdateFactory.newLatLng(it))
        }
    }

    val scaffoldState = rememberBottomSheetScaffoldState(
        bottomSheetState = rememberStandardBottomSheetState(
            initialValue = SheetValue.PartiallyExpanded,
        ),
    )

    BottomSheetScaffold(
        scaffoldState = scaffoldState,
        sheetPeekHeight = 200.dp,
        sheetShape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        sheetContent = {
            TrackingInfoPanel(
                tracking = tracking,
                isLoading = uiState.isLoading,
                error = uiState.error,
            )
        },
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            // Google Map
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraPositionState,
                properties = MapProperties(isMyLocationEnabled = false),
                uiSettings = MapUiSettings(
                    zoomControlsEnabled = false,
                    myLocationButtonEnabled = false,
                ),
            ) {
                // Bus marker at current position
                currentPosition?.let { pos ->
                    Marker(
                        state = MarkerState(position = pos),
                        title = tracking?.vehicle?.registrationNumber ?: "Bus",
                        snippet = tracking?.driver?.name ?: "",
                        icon = BitmapDescriptorFactory.defaultMarker(
                            BitmapDescriptorFactory.HUE_CYAN,
                        ),
                    )
                }

                // Route polyline from position history
                val routePoints = tracking?.positions?.map {
                    LatLng(it.latitude, it.longitude)
                } ?: emptyList()

                if (routePoints.size >= 2) {
                    Polyline(
                        points = routePoints,
                        color = TwendeTeal,
                        width = 8f,
                    )
                }
            }

            // Back button
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(16.dp)
                    .size(40.dp)
                    .background(Color.White, CircleShape),
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.Black,
                )
            }

            // Re-center button
            SmallFloatingActionButton(
                onClick = {
                    currentPosition?.let {
                        cameraPositionState.move(CameraUpdateFactory.newLatLng(it))
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(16.dp),
                containerColor = Color.White,
                contentColor = TwendeTeal,
            ) {
                Icon(Icons.Default.MyLocation, contentDescription = "Re-center")
            }

            // SOS FAB
            FloatingActionButton(
                onClick = { onNavigateToSOS(journeyId) },
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 220.dp),
                containerColor = TwendeRed,
                contentColor = Color.White,
                shape = CircleShape,
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "SOS Emergency",
                    modifier = Modifier.size(28.dp),
                )
            }
        }
    }
}

@Composable
private fun TrackingInfoPanel(
    tracking: com.twende.app.data.model.JourneyTracking?,
    isLoading: Boolean,
    error: String?,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        // Drag handle
        Box(
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .width(40.dp)
                .height(4.dp)
                .background(Color.LightGray, RoundedCornerShape(2.dp)),
        )

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading && tracking == null) {
            Text(
                text = "Loading tracking data...",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
            )
            return@Column
        }

        if (error != null && tracking == null) {
            Text(
                text = error,
                style = MaterialTheme.typography.bodyMedium,
                color = TwendeRed,
            )
            return@Column
        }

        tracking?.let { data ->
            // Route
            data.route?.let { route ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        imageVector = Icons.Default.DirectionsBus,
                        contentDescription = null,
                        tint = TwendeTeal,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "${route.origin} \u2192 ${route.destination}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Driver and vehicle
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        text = "Driver",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                    Text(
                        text = data.driver?.name ?: "Unknown",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "Vehicle",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                    Text(
                        text = data.vehicle?.registrationNumber ?: "N/A",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            // Speed and ETA
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Speed with color coding
                Column {
                    Text(
                        text = "Speed",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                    val speed = data.currentSpeed ?: 0.0
                    val speedColor = when {
                        speed < 80 -> TwendeGreen
                        speed <= 100 -> TwendeAmber
                        else -> TwendeRed
                    }
                    Text(
                        text = "${speed.toInt()} km/h",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                        color = speedColor,
                    )
                }

                // ETA
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "ETA",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary,
                    )
                    Text(
                        text = data.eta ?: "--:--",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Status badge
            val statusText = data.positions.lastOrNull()?.let { "EN_ROUTE" } ?: "WAITING"
            StatusChip(status = statusText)
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (bgColor, textColor) = when (status) {
        "EN_ROUTE" -> TwendeTeal.copy(alpha = 0.12f) to TwendeTeal
        "ARRIVED" -> TwendeGreen.copy(alpha = 0.12f) to TwendeGreen
        "DELAYED" -> TwendeAmber.copy(alpha = 0.12f) to TwendeAmber
        else -> Color.LightGray.copy(alpha = 0.3f) to TextSecondary
    }

    Box(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            text = status.replace("_", " "),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
            fontSize = 12.sp,
        )
    }
}
