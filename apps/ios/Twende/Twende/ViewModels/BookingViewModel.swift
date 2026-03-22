import SwiftUI

@MainActor
final class BookingViewModel: ObservableObject {
    @Published var seats: [SeatAvailability] = []
    @Published var selectedSeat: Int?
    @Published var selectedPayment = "AIRTEL_MONEY"
    @Published var bookings: [Booking] = []
    @Published var currentBooking: Booking?
    @Published var isLoading = false
    @Published var error: String?
    @Published var activeTab = 0
    @Published var showCancelAlert = false

    private let bookingRepo = BookingRepository.shared
    private let journeyRepo = JourneyRepository.shared

    func loadSeats(journeyId: String) async {
        isLoading = true
        do {
            seats = try await journeyRepo.getSeats(journeyId: journeyId)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func createBooking(journeyId: String, passengerName: String?, passengerPhone: String?) async -> Booking? {
        guard let seat = selectedSeat else { return nil }
        isLoading = true
        error = nil
        do {
            let request = BookingRequest(
                journeyId: journeyId,
                seatNumber: seat,
                paymentMethod: selectedPayment,
                passengerName: passengerName,
                passengerPhone: passengerPhone
            )
            let booking = try await bookingRepo.createBooking(request)
            isLoading = false
            return booking
        } catch {
            self.error = error.localizedDescription
            isLoading = false
            return nil
        }
    }

    func loadBookings() async {
        isLoading = true
        do {
            bookings = try await bookingRepo.getBookings()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func loadBooking(reference: String) async {
        isLoading = true
        do {
            currentBooking = try await bookingRepo.getBooking(reference: reference)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func cancelBooking(reference: String) async {
        isLoading = true
        do {
            try await bookingRepo.cancelBooking(reference: reference)
            await loadBooking(reference: reference)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func checkIn(reference: String) async {
        isLoading = true
        do {
            try await bookingRepo.checkIn(reference: reference)
            await loadBooking(reference: reference)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    var filteredBookings: [Booking] {
        switch activeTab {
        case 1: return bookings.filter { ["CONFIRMED", "RESERVED"].contains($0.status.uppercased()) }
        case 2: return bookings.filter { $0.status.uppercased() == "COMPLETED" }
        case 3: return bookings.filter { $0.status.uppercased() == "CANCELLED" }
        default: return bookings
        }
    }
}
