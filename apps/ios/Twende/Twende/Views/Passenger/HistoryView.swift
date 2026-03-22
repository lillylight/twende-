import SwiftUI

struct HistoryView: View {
    @StateObject private var vm = HistoryViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Spending Summary
                VStack(alignment: .leading, spacing: 12) {
                    Text("Spending Summary")
                        .font(.headline)

                    HStack(spacing: 12) {
                        spendingCard("This Month", amount: vm.spending.thisMonth, color: .twendeTeal)
                        spendingCard("This Year", amount: vm.spending.thisYear, color: .twendeAmber)
                        spendingCard("All Time", amount: vm.spending.allTime, color: .textSecondary)
                    }
                }
                .padding(.horizontal, 16)

                // History List
                VStack(alignment: .leading, spacing: 12) {
                    Text("Trip History")
                        .font(.headline)
                        .padding(.horizontal, 16)

                    if vm.isLoading && vm.bookings.isEmpty {
                        LoadingView(message: "Loading history...")
                    } else if vm.bookings.isEmpty {
                        EmptyStateView(
                            icon: "clock",
                            title: "No History",
                            message: "Your completed trips will appear here"
                        )
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(vm.bookings) { booking in
                                historyRow(booking)
                            }

                            if vm.hasMore {
                                Button("Load More") {
                                    Task { await vm.loadHistory() }
                                }
                                .foregroundColor(.twendeTeal)
                                .padding()
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
            }
            .padding(.top, 16)
        }
        .background(Color.bgPrimary)
        .navigationTitle("History")
        .task { await vm.loadHistory(reset: true) }
    }

    private func spendingCard(_ title: String, amount: Double, color: Color) -> some View {
        VStack(spacing: 6) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.textSecondary)
            Text(amount.kwacha)
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(.white)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }

    private func historyRow(_ booking: Booking) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(booking.status.statusColor.opacity(0.15))
                .frame(width: 40, height: 40)
                .overlay(
                    Image(systemName: "bus.fill")
                        .font(.caption)
                        .foregroundColor(booking.status.statusColor)
                )

            VStack(alignment: .leading, spacing: 4) {
                if let journey = booking.journey, let route = journey.route {
                    Text("\(route.fromCity) → \(route.toCity)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                Text(booking.createdAt?.prefix(10).description ?? booking.reference)
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(booking.price.kwacha)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                StatusBadge(status: booking.status)
            }
        }
        .padding(12)
        .background(.white)
        .cornerRadius(12)
    }
}
