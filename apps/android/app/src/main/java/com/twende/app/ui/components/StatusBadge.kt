package com.twende.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.twende.app.ui.theme.TwendeGreen
import com.twende.app.ui.theme.TwendeRed
import com.twende.app.ui.theme.TwendeAmber
import com.twende.app.ui.theme.TwendeTeal
import com.twende.app.ui.theme.Gray200
import com.twende.app.ui.theme.TextSecondary

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier,
) {
    val (bgColor, textColor) = when (status.lowercase()) {
        "confirmed", "active", "checked_in", "success" -> TwendeGreen.copy(alpha = 0.12f) to TwendeGreen
        "reserved", "pending", "initiated", "scheduled" -> TwendeAmber.copy(alpha = 0.12f) to TwendeAmber
        "cancelled", "failed", "expired" -> TwendeRed.copy(alpha = 0.12f) to TwendeRed
        "completed" -> TwendeTeal.copy(alpha = 0.12f) to TwendeTeal
        else -> Gray200 to TextSecondary
    }

    Text(
        text = status.replace("_", " ").uppercase(),
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bgColor)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = textColor,
    )
}
