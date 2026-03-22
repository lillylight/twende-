package com.twende.app.ui.payments

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.twende.app.ui.components.TwendeButton
import com.twende.app.ui.theme.TwendeGreen
import com.twende.app.ui.theme.TwendeRed
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.TextSecondary

// Provider brand colors
private val AirtelRed = Color(0xFFED1C24)
private val MtnYellow = Color(0xFFFFCC00)
private val ZamtelGreen = Color(0xFF00A651)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentScreen(
    reference: String,
    method: String,
    userPhone: String? = null,
    onPaymentComplete: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: PaymentViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    var phoneNumber by remember { mutableStateOf(userPhone ?: "") }

    LaunchedEffect(reference) {
        viewModel.loadBooking(reference)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Complete Payment") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when (uiState.paymentStatus) {
                PaymentStatus.PENDING -> PendingContent(
                    booking = uiState.booking,
                    method = method,
                    phoneNumber = phoneNumber,
                    onPhoneChange = { phoneNumber = it.filter { c -> c.isDigit() } },
                    onPay = {
                        viewModel.initiatePayment(reference, method, phoneNumber)
                    },
                    error = uiState.error,
                )

                PaymentStatus.PROCESSING -> ProcessingContent(
                    remainingSeconds = uiState.remainingSeconds,
                    method = method,
                )

                PaymentStatus.SUCCESS -> SuccessContent(
                    reference = reference,
                    onViewBooking = { onPaymentComplete(reference) },
                )

                PaymentStatus.FAILED -> FailedContent(
                    error = uiState.error,
                    onRetry = { viewModel.retryPayment() },
                )
            }
        }
    }
}

@Composable
private fun PendingContent(
    booking: com.twende.app.data.model.Booking?,
    method: String,
    phoneNumber: String,
    onPhoneChange: (String) -> Unit,
    onPay: () -> Unit,
    error: String?,
) {
    Spacer(modifier = Modifier.height(16.dp))

    // Booking summary card
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "Booking Summary",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )

            Spacer(modifier = Modifier.height(12.dp))

            booking?.let { b ->
                SummaryRow("Route", b.journey?.route?.let { "${it.origin} \u2192 ${it.destination}" } ?: "")
                SummaryRow("Seat", b.seatNumber?.toString() ?: "N/A")
                SummaryRow("Reference", b.reference)

                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = "Amount",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = "K${b.price}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = TwendeTeal,
                    )
                }
            } ?: Text(
                text = "Loading booking details...",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
            )
        }
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Payment method display
    val (providerName, providerColor) = when (method.uppercase()) {
        "AIRTEL_MONEY", "AIRTEL" -> "Airtel Money" to AirtelRed
        "MTN_MOMO", "MTN" -> "MTN MoMo" to MtnYellow
        "ZAMTEL", "ZAMTEL_KWACHA" -> "Zamtel Kwacha" to ZamtelGreen
        else -> method to TwendeTeal
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
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
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(providerColor, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.PhoneAndroid,
                    contentDescription = null,
                    tint = if (method.uppercase().contains("MTN")) Color.Black else Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = providerName,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Medium,
            )
        }
    }

    Spacer(modifier = Modifier.height(20.dp))

    // Phone number input
    OutlinedTextField(
        value = phoneNumber,
        onValueChange = onPhoneChange,
        label = { Text("Phone Number") },
        prefix = { Text("+260 ") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        singleLine = true,
    )

    if (error != null) {
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = error,
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodySmall,
        )
    }

    Spacer(modifier = Modifier.height(24.dp))

    // Pay button
    val amount = booking?.price?.let { "K$it" } ?: "..."
    TwendeButton(
        text = "Pay $amount",
        onClick = onPay,
        enabled = phoneNumber.length >= 9 && booking != null,
        modifier = Modifier.fillMaxWidth(),
    )

    Spacer(modifier = Modifier.height(32.dp))
}

@Composable
private fun ProcessingContent(
    remainingSeconds: Int,
    method: String,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "phone_pulse")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "phone_alpha",
    )

    Spacer(modifier = Modifier.height(80.dp))

    Icon(
        imageVector = Icons.Default.PhoneAndroid,
        contentDescription = "Check your phone",
        tint = TwendeTeal,
        modifier = Modifier
            .size(80.dp)
            .alpha(alpha),
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Check your phone for the payment prompt",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        textAlign = TextAlign.Center,
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Waiting for confirmation...",
        style = MaterialTheme.typography.bodyMedium,
        color = TextSecondary,
        textAlign = TextAlign.Center,
    )

    Spacer(modifier = Modifier.height(24.dp))

    // Countdown timer
    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    Text(
        text = String.format("%d:%02d", minutes, seconds),
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = if (remainingSeconds < 60) TwendeRed else TextSecondary,
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Time remaining",
        style = MaterialTheme.typography.bodySmall,
        color = TextSecondary,
    )
}

@Composable
private fun SuccessContent(
    reference: String,
    onViewBooking: () -> Unit,
) {
    Spacer(modifier = Modifier.height(80.dp))

    Icon(
        imageVector = Icons.Default.CheckCircle,
        contentDescription = "Payment successful",
        tint = TwendeGreen,
        modifier = Modifier.size(80.dp),
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Payment Successful!",
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        color = TwendeGreen,
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = "Your booking has been confirmed",
        style = MaterialTheme.typography.bodyMedium,
        color = TextSecondary,
    )

    Spacer(modifier = Modifier.height(16.dp))

    Text(
        text = "Reference: $reference",
        style = MaterialTheme.typography.bodyLarge,
        fontWeight = FontWeight.Medium,
    )

    Spacer(modifier = Modifier.height(32.dp))

    TwendeButton(
        text = "View Booking",
        onClick = onViewBooking,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun FailedContent(
    error: String?,
    onRetry: () -> Unit,
) {
    Spacer(modifier = Modifier.height(80.dp))

    Icon(
        imageVector = Icons.Default.Close,
        contentDescription = "Payment failed",
        tint = TwendeRed,
        modifier = Modifier.size(80.dp),
    )

    Spacer(modifier = Modifier.height(24.dp))

    Text(
        text = "Payment Failed",
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        color = TwendeRed,
    )

    Spacer(modifier = Modifier.height(8.dp))

    Text(
        text = error ?: "An error occurred during payment",
        style = MaterialTheme.typography.bodyMedium,
        color = TextSecondary,
        textAlign = TextAlign.Center,
    )

    Spacer(modifier = Modifier.height(32.dp))

    TwendeButton(
        text = "Try Again",
        onClick = onRetry,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun SummaryRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary,
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
        )
    }
}
