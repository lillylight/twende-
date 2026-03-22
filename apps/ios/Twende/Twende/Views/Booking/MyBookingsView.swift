import SwiftUI

struct MyBookingsView: View {
    @EnvironmentObject var router: Router
    @StateObject private var vm = BookingViewModel()
    let tabs = ["All", "Active", "Completed", "Cancelled"]

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(0..<tabs.count, id: \.self) { index in
                        Button {
                            vm.activeTab = index
                        } label: {
                            Text(tabs[index])
                                .font(.subheadline)
                                .fontWeight(vm.activeTab == index ? .semibold : .regular)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(vm.activeTab == index ? Color.twendeTeal : Color(.systemGray6))
                                .foregroundColor(vm.activeTab == index ? .white : .textSecondary)
                                .cornerRadius(20)
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }

            // Content
            if vm.isLoading && vm.bookings.isEmpty {
                LoadingView(message: "Loading bookings...")
            } else if vm.filteredBookings.isEmpty {
                EmptyStateView(
                    icon: "ticket",
                    title: "No Bookings",
                    message: "Your \(tabs[vm.activeTab].lowercased()) bookings will appear here"
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(vm.filteredBookings) { booking in
                            bookingCard(booking)
                                .onTapGesture {
                                    router.navigate(to: .bookingDetail(reference: booking.reference))
                                }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(Color.bgPrimary)
        .navigationTitle("My Trips")
        .task { await vm.loadBookings() }
    }

    private func bookingCard(_ booking: Booking) -> some View {
        VStack(spacing: 12) {
            HStack {
                Text(booking.reference)
                    .font(.subheadline)
                    .fontWeight(.bold)
                Spacer()
                StatusBadge(status: booking.status)
            }

            if let journey = booking.journey {
                if let route = journey.route {
                    HStack {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.twendeTeal)
                            .font(.caption)
                        Text("\(route.fromCity) → \(route.toCity)")
                            .font(.subheadline)
                        Spacer()
                    }
                }

                HStack {
                    Label(journey.departureTime.prefix(10).description, systemImage: "calendar")
                    Spacer()
                    Text(booking.price.kwacha)
                        .fontWeight(.semibold)
                        .foregroundColor(.twendeTeal)
                }
                .font(.caption)
                .foregroundColor(.textSecondary)
            }
        }
        .padding(16)
        .background(.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}
