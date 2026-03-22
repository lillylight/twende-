import SwiftUI

struct PassengerHomeView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var router: Router
    @StateObject private var vm = SearchViewModel()
    @State private var showDatePicker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Teal Header
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Hello, \(appState.currentUser?.displayName ?? "Traveller")")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                            Text("Where are you heading?")
                                .font(.subheadline)
                                .foregroundColor(.white.opacity(0.8))
                        }
                        Spacer()
                        Image(systemName: "bus.fill")
                            .font(.title)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .padding(24)
                .padding(.top, 8)
                .background(
                    LinearGradient(
                        colors: [.twendeTeal, .twendeTealDark],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

                // Search Card
                VStack(spacing: 16) {
                    // Route Picker
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Select Route")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        Menu {
                            ForEach(vm.routes) { route in
                                Button("\(route.fromCity) → \(route.toCity)") {
                                    vm.selectedRoute = route
                                }
                            }
                        } label: {
                            HStack {
                                Image(systemName: "mappin.and.ellipse")
                                    .foregroundColor(.twendeTeal)
                                Text(vm.selectedRoute.map { "\($0.fromCity) → \($0.toCity)" } ?? "Choose a route")
                                    .foregroundColor(vm.selectedRoute == nil ? .textSecondary : .textPrimary)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .foregroundColor(.textSecondary)
                            }
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                        }
                    }

                    // Date Picker
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Travel Date")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        Button {
                            showDatePicker.toggle()
                        } label: {
                            HStack {
                                Image(systemName: "calendar")
                                    .foregroundColor(.twendeTeal)
                                Text(vm.selectedDate.formatted(date: .abbreviated, time: .omitted))
                                    .foregroundColor(.textPrimary)
                                Spacer()
                                Image(systemName: "chevron.down")
                                    .foregroundColor(.textSecondary)
                            }
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                        }
                    }

                    if showDatePicker {
                        DatePicker("", selection: $vm.selectedDate, in: Date()..., displayedComponents: .date)
                            .datePickerStyle(.graphical)
                            .tint(.twendeTeal)
                    }

                    TwendeButton(
                        title: "Search Buses",
                        isLoading: vm.isSearching,
                        isDisabled: vm.selectedRoute == nil
                    ) {
                        Task { await vm.searchJourneys() }
                    }
                }
                .padding(20)
                .background(.white)
                .cornerRadius(16)
                .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
                .padding(.horizontal, 16)
                .offset(y: -16)

                // Error
                if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                        .padding()
                }

                // Journey Results
                if !vm.journeys.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Available Buses")
                            .font(.headline)
                            .padding(.horizontal, 16)

                        ForEach(vm.journeys) { journey in
                            journeyCard(journey)
                                .onTapGesture {
                                    router.navigate(to: .seatSelection(journeyId: journey.id))
                                }
                        }
                    }
                    .padding(.top, 8)
                }

                // Recent Bookings
                if !vm.recentBookings.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Bookings")
                            .font(.headline)
                            .padding(.horizontal, 16)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(vm.recentBookings.prefix(5)) { booking in
                                    recentBookingCard(booking)
                                        .onTapGesture {
                                            router.navigate(to: .bookingDetail(reference: booking.reference))
                                        }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    .padding(.top, 20)
                }

                Spacer(minLength: 32)
            }
        }
        .background(Color.bgPrimary)
        .navigationBarHidden(true)
        .task { await vm.loadInitialData() }
    }

    // MARK: - Journey Card

    private func journeyCard(_ journey: Journey) -> some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    if let route = journey.route {
                        Text("\(route.fromCity) → \(route.toCity)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                    }
                    if let op = journey.operator {
                        Text(op.name)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
                Spacer()
                if let price = journey.price {
                    Text(price.kwacha)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.twendeTeal)
                }
            }

            HStack {
                Label(formatTime(journey.departureTime), systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                Spacer()
                Text("\(journey.availableSeats) seats left")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(journey.availableSeats < 5 ? .twendeRed : .twendeGreen)

                StatusBadge(status: journey.status)
            }
        }
        .padding(16)
        .background(.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        .padding(.horizontal, 16)
    }

    private func recentBookingCard(_ booking: Booking) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(booking.reference)
                    .font(.caption)
                    .fontWeight(.bold)
                Spacer()
                StatusBadge(status: booking.status)
            }
            if let journey = booking.journey, let route = journey.route {
                Text("\(route.fromCity) → \(route.toCity)")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            Text(booking.price.kwacha)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.twendeTeal)
        }
        .padding(12)
        .frame(width: 180)
        .background(.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func formatTime(_ dateStr: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: dateStr) else { return dateStr }
        let display = DateFormatter()
        display.dateFormat = "HH:mm"
        return display.string(from: date)
    }
}
