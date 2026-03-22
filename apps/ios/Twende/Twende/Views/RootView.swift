import SwiftUI

struct RootView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var router: Router

    var body: some View {
        Group {
            if appState.isLoading {
                splashView
            } else if appState.isLoggedIn {
                MainTabView()
            } else {
                NavigationStack {
                    LoginView()
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.isLoggedIn)
    }

    private var splashView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bus.fill")
                .font(.system(size: 64))
                .foregroundColor(.twendeTeal)
            Text("Twende")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.twendeTeal)
            ProgressView()
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.bgPrimary)
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    @EnvironmentObject var router: Router
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack(path: $router.path) {
                PassengerHomeView()
                    .navigationDestination(for: Route.self) { route in
                        destinationView(for: route)
                    }
            }
            .tabItem {
                Image(systemName: "house.fill")
                Text("Home")
            }
            .tag(0)

            NavigationStack {
                MyBookingsView()
                    .navigationDestination(for: Route.self) { route in
                        destinationView(for: route)
                    }
            }
            .tabItem {
                Image(systemName: "ticket.fill")
                Text("My Trips")
            }
            .tag(1)

            NavigationStack {
                HistoryView()
            }
            .tabItem {
                Image(systemName: "clock.fill")
                Text("History")
            }
            .tag(2)

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Image(systemName: "person.fill")
                Text("Profile")
            }
            .tag(3)
        }
        .tint(.twendeTeal)
    }

    @ViewBuilder
    private func destinationView(for route: Route) -> some View {
        switch route {
        case .passengerHome:
            PassengerHomeView()
        case .seatSelection(let journeyId):
            SeatSelectionView(journeyId: journeyId)
        case .bookingConfirmation(let reference):
            BookingConfirmationView(reference: reference)
        case .payment(let reference, let method):
            PaymentView(reference: reference, method: method)
        case .myBookings:
            MyBookingsView()
        case .bookingDetail(let reference):
            BookingDetailView(reference: reference)
        case .tracking(let journeyId):
            TrackingView(journeyId: journeyId)
        case .history:
            HistoryView()
        case .profile:
            ProfileView()
        case .sos(let journeyId):
            SOSView(journeyId: journeyId)
        case .rating(let journeyId, let driverId):
            RatingView(journeyId: journeyId, driverId: driverId)
        }
    }
}
