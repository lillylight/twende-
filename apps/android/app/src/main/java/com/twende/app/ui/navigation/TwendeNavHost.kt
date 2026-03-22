package com.twende.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.twende.app.ui.auth.LoginScreen
import com.twende.app.ui.auth.OtpVerifyScreen
import com.twende.app.ui.auth.RegisterScreen
import com.twende.app.ui.passenger.booking.BookingConfirmationScreen
import com.twende.app.ui.passenger.booking.BookingDetailScreen
import com.twende.app.ui.passenger.booking.MyBookingsScreen
import com.twende.app.ui.passenger.booking.SeatSelectionScreen
import com.twende.app.ui.passenger.history.HistoryScreen
import com.twende.app.ui.passenger.profile.ProfileScreen
import com.twende.app.ui.passenger.search.PassengerHomeScreen
import com.twende.app.ui.payments.PaymentScreen
import com.twende.app.ui.ratings.RatingScreen
import com.twende.app.ui.sos.SOSScreen
import com.twende.app.ui.tracking.TrackingScreen

@Composable
fun TwendeNavHost(
    navController: NavHostController = rememberNavController(),
    rootViewModel: RootViewModel = hiltViewModel(),
) {
    val isLoggedIn by rootViewModel.isLoggedIn.collectAsState()

    if (isLoggedIn == null) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    val startDestination = if (isLoggedIn == true) {
        Screen.PassengerHome.route
    } else {
        Screen.Login.route
    }

    NavHost(
        navController = navController,
        startDestination = startDestination,
    ) {

        // ── Auth ────────────────────────────────────────────────
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                onLoginSuccess = {
                    navController.navigate(Screen.PassengerHome.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
            )
        }

        composable(Screen.Register.route) {
            RegisterScreen(
                onNavigateToLogin = { navController.popBackStack() },
                onNavigateToOtp = { phone ->
                    navController.navigate(Screen.OtpVerify.createRoute(phone))
                },
            )
        }

        composable(
            route = Screen.OtpVerify.ROUTE,
            arguments = listOf(navArgument("phone") { type = NavType.StringType }),
        ) { backStackEntry ->
            val phone = backStackEntry.arguments?.getString("phone") ?: ""
            OtpVerifyScreen(
                phone = phone,
                onVerifySuccess = {
                    navController.navigate(Screen.PassengerHome.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ── Passenger Home ──────────────────────────────────────
        composable(Screen.PassengerHome.route) {
            PassengerHomeScreen(
                navController = navController,
                onJourneyClick = { journeyId ->
                    navController.navigate(Screen.SeatSelection.createRoute(journeyId))
                },
                onBookingClick = { reference ->
                    navController.navigate(Screen.BookingDetail.createRoute(reference))
                },
            )
        }

        // ── Seat Selection ──────────────────────────────────────
        composable(
            route = Screen.SeatSelection.ROUTE,
            arguments = listOf(navArgument("journeyId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val journeyId = backStackEntry.arguments?.getString("journeyId") ?: ""
            SeatSelectionScreen(
                journeyId = journeyId,
                onBookingSuccess = { ref ->
                    navController.navigate(Screen.BookingConfirmation.createRoute(ref))
                },
                onNavigateToPayment = { ref, method ->
                    navController.navigate(Screen.Payment.createRoute(ref, method))
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ── Booking Confirmation ────────────────────────────────
        composable(
            route = Screen.BookingConfirmation.ROUTE,
            arguments = listOf(navArgument("reference") { type = NavType.StringType }),
        ) { backStackEntry ->
            val reference = backStackEntry.arguments?.getString("reference") ?: ""
            BookingConfirmationScreen(
                reference = reference,
                onViewBookings = {
                    navController.navigate(Screen.MyBookings.route) {
                        popUpTo(Screen.PassengerHome.route)
                    }
                },
                onTrackJourney = { journeyId ->
                    navController.navigate(Screen.Tracking.createRoute(journeyId))
                },
            )
        }

        // ── Payment ─────────────────────────────────────────────
        composable(
            route = Screen.Payment.ROUTE,
            arguments = listOf(
                navArgument("reference") { type = NavType.StringType },
                navArgument("method") { type = NavType.StringType },
            ),
        ) { backStackEntry ->
            val reference = backStackEntry.arguments?.getString("reference") ?: ""
            val method = backStackEntry.arguments?.getString("method") ?: ""
            PaymentScreen(
                reference = reference,
                method = method,
                onPaymentComplete = { ref ->
                    navController.navigate(Screen.BookingConfirmation.createRoute(ref)) {
                        popUpTo(Screen.PassengerHome.route)
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ── My Bookings ─────────────────────────────────────────
        composable(Screen.MyBookings.route) {
            MyBookingsScreen(
                navController = navController,
                onBookingClick = { ref ->
                    navController.navigate(Screen.BookingDetail.createRoute(ref))
                },
                onSearchClick = {
                    navController.navigate(Screen.PassengerHome.route)
                },
            )
        }

        // ── Booking Detail ──────────────────────────────────────
        composable(
            route = Screen.BookingDetail.ROUTE,
            arguments = listOf(navArgument("reference") { type = NavType.StringType }),
        ) { backStackEntry ->
            val reference = backStackEntry.arguments?.getString("reference") ?: ""
            BookingDetailScreen(
                reference = reference,
                onBack = { navController.popBackStack() },
                onTrackJourney = { journeyId ->
                    navController.navigate(Screen.Tracking.createRoute(journeyId))
                },
                onRateJourney = { journeyId, driverId ->
                    navController.navigate(Screen.Rating.createRoute(journeyId, driverId))
                },
            )
        }

        // ── Tracking ────────────────────────────────────────────
        composable(
            route = Screen.Tracking.ROUTE,
            arguments = listOf(navArgument("journeyId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val journeyId = backStackEntry.arguments?.getString("journeyId") ?: ""
            TrackingScreen(
                journeyId = journeyId,
                onNavigateToSOS = { id ->
                    navController.navigate(Screen.SOS.createRoute(id))
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ── History ─────────────────────────────────────────────
        composable(Screen.History.route) {
            HistoryScreen(
                navController = navController,
                onBookingClick = { ref ->
                    navController.navigate(Screen.BookingDetail.createRoute(ref))
                },
            )
        }

        // ── Profile ─────────────────────────────────────────────
        composable(Screen.Profile.route) {
            ProfileScreen(
                navController = navController,
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
            )
        }

        // ── SOS ─────────────────────────────────────────────────
        composable(
            route = Screen.SOS.ROUTE,
            arguments = listOf(navArgument("journeyId") { type = NavType.StringType }),
        ) { backStackEntry ->
            val journeyId = backStackEntry.arguments?.getString("journeyId") ?: ""
            SOSScreen(
                journeyId = journeyId,
                onBack = { navController.popBackStack() },
            )
        }

        // ── Rating ──────────────────────────────────────────────
        composable(
            route = Screen.Rating.ROUTE,
            arguments = listOf(
                navArgument("journeyId") { type = NavType.StringType },
                navArgument("driverId") { type = NavType.StringType },
            ),
        ) { backStackEntry ->
            val journeyId = backStackEntry.arguments?.getString("journeyId") ?: ""
            val driverId = backStackEntry.arguments?.getString("driverId") ?: ""
            RatingScreen(
                journeyId = journeyId,
                driverId = driverId,
                onSubmitSuccess = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
            )
        }
    }
}
