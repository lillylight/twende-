import SwiftUI

@MainActor
final class SearchViewModel: ObservableObject {
    @Published var routes: [BusRoute] = []
    @Published var journeys: [Journey] = []
    @Published var recentBookings: [Booking] = []
    @Published var selectedRoute: BusRoute?
    @Published var selectedDate = Date()
    @Published var isLoading = false
    @Published var isSearching = false
    @Published var error: String?

    private let journeyRepo = JourneyRepository.shared
    private let bookingRepo = BookingRepository.shared

    func loadInitialData() async {
        isLoading = true
        do {
            async let routesTask = journeyRepo.getRoutes()
            async let bookingsTask = bookingRepo.getBookings()
            routes = try await routesTask
            recentBookings = try await bookingsTask
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func searchJourneys() async {
        guard let route = selectedRoute else { return }
        isSearching = true
        error = nil
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            let dateStr = formatter.string(from: selectedDate)
            journeys = try await journeyRepo.searchJourneys(routeId: route.id, date: dateStr)
        } catch {
            self.error = error.localizedDescription
        }
        isSearching = false
    }
}
