import SwiftUI

@MainActor
final class HistoryViewModel: ObservableObject {
    @Published var bookings: [Booking] = []
    @Published var spending = SpendingSummary()
    @Published var isLoading = false
    @Published var error: String?
    @Published var currentPage = 1
    @Published var hasMore = true

    private let bookingRepo = BookingRepository.shared

    func loadHistory(reset: Bool = false) async {
        if reset {
            currentPage = 1
            hasMore = true
            bookings = []
        }
        guard hasMore else { return }
        isLoading = true
        do {
            let response = try await bookingRepo.getHistory(page: currentPage)
            if reset {
                bookings = response.bookings
            } else {
                bookings.append(contentsOf: response.bookings)
            }
            if let s = response.spending {
                spending = s
            }
            hasMore = bookings.count < response.total
            currentPage += 1
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
