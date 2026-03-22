package com.twende.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val TwendeLightColorScheme = lightColorScheme(
    primary = TwendeTeal,
    onPrimary = OnPrimary,
    primaryContainer = TwendeTeal.copy(alpha = 0.12f),
    onPrimaryContainer = TwendeTealDark,
    secondary = TwendeTealDark,
    onSecondary = OnPrimary,
    secondaryContainer = TwendeTealDark.copy(alpha = 0.12f),
    onSecondaryContainer = TwendeTealDark,
    tertiary = TwendeAmber,
    onTertiary = TextPrimary,
    tertiaryContainer = TwendeAmber.copy(alpha = 0.12f),
    onTertiaryContainer = TextPrimary,
    error = TwendeRed,
    onError = OnPrimary,
    errorContainer = TwendeRed.copy(alpha = 0.12f),
    onErrorContainer = TwendeRed,
    background = Background,
    onBackground = TextPrimary,
    surface = Surface,
    onSurface = TextPrimary,
    surfaceVariant = Gray100,
    onSurfaceVariant = TextSecondary,
    outline = Gray300,
    outlineVariant = Gray200,
)

@Composable
fun TwendeTheme(
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = TwendeLightColorScheme,
        typography = TwendeTypography,
        content = content,
    )
}
