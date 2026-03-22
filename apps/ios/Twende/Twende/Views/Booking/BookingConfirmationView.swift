import SwiftUI

struct BookingConfirmationView: View {
    let reference: String
    @EnvironmentObject var router: Router
    @StateObject private var vm = BookingViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Success Icon
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 64))
                        .foregroundColor(.twendeGreen)
                    Text("Booking Confirmed!")
                        .font(.title2)
                        .fontWeight(.bold)
                    Text("Your seat has been reserved")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                .padding(.top, 24)

                // Reference
                VStack(spacing: 8) {
                    Text("Booking Reference")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                    Text(reference)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.twendeTeal)
                        .padding(12)
                        .background(Color.twendeTeal.opacity(0.1))
                        .cornerRadius(8)
                        .onTapGesture {
                            UIPasteboard.general.string = reference
                        }
                    Text("Tap to copy")
                        .font(.caption2)
                        .foregroundColor(.textSecondary)
                }

                // Booking Details
                if let booking = vm.currentBooking {
                    VStack(spacing: 12) {
                        detailRow("Seat", value: booking.seatNumber.map { "Seat \($0)" } ?? "-")
                        detailRow("Price", value: booking.price.kwacha)
                        detailRow("Payment", value: booking.paymentMethod?.replacingOccurrences(of: "_", with: " ") ?? "-")
                        detailRow("Status", value: booking.status.statusLabel)
                        if let journey = booking.journey, let route = journey.route {
                            detailRow("Route", value: "\(route.fromCity) → \(route.toCity)")
                            detailRow("Departure", value: journey.departureTime)
                        }
                    }
                    .padding(16)
                    .background(.white)
                    .cornerRadius(16)
                }

                // Actions
                VStack(spacing: 12) {
                    TwendeButton(title: "View My Bookings") {
                        router.popToRoot()
                    }

                    if let booking = vm.currentBooking, let journeyId = booking.journey?.id {
                        TwendeButton(title: "Track Journey", style: .secondary) {
                            router.navigate(to: .tracking(journeyId: journeyId))
                        }
                    }

                    if let booking = vm.currentBooking {
                        TwendeButton(title: "Pay Now", style: .secondary) {
                            router.navigate(to: .payment(
                                reference: booking.reference,
                                method: booking.paymentMethod ?? "AIRTEL_MONEY"
                            ))
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Confirmation")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.loadBooking(reference: reference) }
    }

    private func detailRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}
