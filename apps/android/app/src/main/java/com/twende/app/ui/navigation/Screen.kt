package com.twende.app.ui.navigation

sealed class Screen(val route: String) {

    // Auth
    data object Login : Screen("login")
    data object Register : Screen("register")
    data class OtpVerify(val phone: String) : Screen("otp_verify/{phone}") {
        companion object {
            const val ROUTE = "otp_verify/{phone}"
            fun createRoute(phone: String) = "otp_verify/$phone"
        }
    }

    // Passenger
    data object PassengerHome : Screen("passenger_home")
    data object Search : Screen("search")
    data class JourneyResults(val routeId: String, val date: String) :
        Screen("journey_results/{routeId}/{date}") {
        companion object {
            const val ROUTE = "journey_results/{routeId}/{date}"
            fun createRoute(routeId: String, date: String) = "journey_results/$routeId/$date"
        }
    }
    data class SeatSelection(val journeyId: String) :
        Screen("seat_selection/{journeyId}") {
        companion object {
            const val ROUTE = "seat_selection/{journeyId}"
            fun createRoute(journeyId: String) = "seat_selection/$journeyId"
        }
    }
    data class BookingConfirmation(val reference: String) :
        Screen("booking_confirmation/{reference}") {
        companion object {
            const val ROUTE = "booking_confirmation/{reference}"
            fun createRoute(reference: String) = "booking_confirmation/$reference"
        }
    }
    data class Payment(val reference: String, val method: String) :
        Screen("payment/{reference}/{method}") {
        companion object {
            const val ROUTE = "payment/{reference}/{method}"
            fun createRoute(reference: String, method: String) = "payment/$reference/$method"
        }
    }

    // Bookings
    data object MyBookings : Screen("my_bookings")
    data class BookingDetail(val reference: String) :
        Screen("booking_detail/{reference}") {
        companion object {
            const val ROUTE = "booking_detail/{reference}"
            fun createRoute(reference: String) = "booking_detail/$reference"
        }
    }

    // Tracking
    data class Tracking(val journeyId: String) :
        Screen("tracking/{journeyId}") {
        companion object {
            const val ROUTE = "tracking/{journeyId}"
            fun createRoute(journeyId: String) = "tracking/$journeyId"
        }
    }
    data class PublicTracking(val token: String) :
        Screen("public_tracking/{token}") {
        companion object {
            const val ROUTE = "public_tracking/{token}"
            fun createRoute(token: String) = "public_tracking/$token"
        }
    }

    // History
    data object History : Screen("history")

    // Profile
    data object Profile : Screen("profile")

    // SOS
    data class SOS(val journeyId: String) :
        Screen("sos/{journeyId}") {
        companion object {
            const val ROUTE = "sos/{journeyId}"
            fun createRoute(journeyId: String) = "sos/$journeyId"
        }
    }

    // Rating
    data class Rating(val journeyId: String, val driverId: String) :
        Screen("rating/{journeyId}/{driverId}") {
        companion object {
            const val ROUTE = "rating/{journeyId}/{driverId}"
            fun createRoute(journeyId: String, driverId: String) =
                "rating/$journeyId/$driverId"
        }
    }
}
