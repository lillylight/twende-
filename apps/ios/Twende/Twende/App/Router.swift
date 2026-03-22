import SwiftUI

enum Route: Hashable {
    case passengerHome
    case seatSelection(journeyId: String)
    case bookingConfirmation(reference: String)
    case payment(reference: String, method: String)
    case myBookings
    case bookingDetail(reference: String)
    case tracking(journeyId: String)
    case history
    case profile
    case sos(journeyId: String)
    case rating(journeyId: String, driverId: String)
}

@MainActor
final class Router: ObservableObject {
    @Published var path = NavigationPath()

    func navigate(to route: Route) {
        path.append(route)
    }

    func pop() {
        if !path.isEmpty {
            path.removeLast()
        }
    }

    func popToRoot() {
        path = NavigationPath()
    }
}
