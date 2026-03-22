import SwiftUI

struct BookingDetailView: View {
    let reference: String
    @EnvironmentObject var router: Router
    @StateObject private var vm = BookingViewModel()

    var body: some View {
        Group {
            if vm.isLoading && vm.currentBooking == nil {
                LoadingView()
            } else if let booking = vm.currentBooking {
                bookingContent(booking)
            } else if let error = vm.error {
                ErrorView(message: error) {
                    Task { await vm.loadBooking(reference: reference) }
                }
            }
        }
        .background(Color.bgPrimary)
        .navigationTitle("Booking Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Cancel Booking?", isPresented: $vm.showCancelAlert) {
            Button("Keep Booking", role: .cancel) {}
            Button("Cancel Booking", role: .destructive) {
                Task { await vm.cancelBooking(reference: reference) }
            }
        } message: {
            Text("This action cannot be undone. Any payment will be refunded within 24 hours.")
        }
        .task { await vm.loadBooking(reference: reference) }
    }

    private func bookingContent(_ booking: Booking) -> some View {
        ScrollView {
            VStack(spacing: 20) {
                // Status Header
                VStack(spacing: 8) {
                    StatusBadge(status: booking.status)
                    Text(booking.reference)
                        .font(.title3)
                        .fontWeight(.bold)
                }
                .padding(.top, 8)

                // Journey Info
                if let journey = booking.journey {
                    VStack(spacing: 12) {
                        sectionHeader("Journey")
                        if let route = journey.route {
                            infoRow("Route", "\(route.fromCity) → \(route.toCity)")
                            infoRow("Distance", "\(route.distanceKm) km")
                        }
                        infoRow("Departure", journey.departureTime)
                        if let op = journey.operator {
                            infoRow("Operator", op.name)
                        }
                        if let driver = journey.driver {
                            infoRow("Driver", driver.name ?? "-")
                        }
                        if let vehicle = journey.vehicle {
                            infoRow("Bus", vehicle.registrationNumber)
                        }
                    }
                    .cardStyle()
                }

                // Booking Info
                VStack(spacing: 12) {
                    sectionHeader("Booking")
                    infoRow("Seat", booking.seatNumber.map { "Seat \($0)" } ?? "-")
                    infoRow("Price", booking.price.kwachaDetailed)
                    infoRow("Payment", booking.paymentMethod?.replacingOccurrences(of: "_", with: " ") ?? "-")
                    infoRow("Payment Status", booking.paymentStatus)
                    if let checkedIn = booking.checkedInAt {
                        infoRow("Checked In", checkedIn)
                    }
                    if let booked = booking.bookedVia {
                        infoRow("Booked Via", booked)
                    }
                }
                .cardStyle()

                // Actions
                VStack(spacing: 12) {
                    let status = booking.status.uppercased()

                    if status == "CONFIRMED" || status == "RESERVED" {
                        if booking.paymentStatus.uppercased() == "PENDING" {
                            TwendeButton(title: "Pay Now") {
                                router.navigate(to: .payment(
                                    reference: booking.reference,
                                    method: booking.paymentMethod ?? "AIRTEL_MONEY"
                                ))
                            }
                        }

                        if booking.checkedInAt == nil {
                            TwendeButton(title: "Check In", style: .secondary) {
                                Task { await vm.checkIn(reference: reference) }
                            }
                        }

                        if let journeyId = booking.journey?.id {
                            TwendeButton(title: "Track Journey", style: .secondary) {
                                router.navigate(to: .tracking(journeyId: journeyId))
                            }
                        }

                        TwendeButton(title: "Cancel Booking", style: .destructive) {
                            vm.showCancelAlert = true
                        }
                    }

                    if status == "COMPLETED", let journey = booking.journey {
                        TwendeButton(title: "Rate This Trip") {
                            router.navigate(to: .rating(
                                journeyId: journey.id,
                                driverId: journey.driverId
                            ))
                        }
                    }
                }
            }
            .padding(16)
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        HStack {
            Text(title)
                .font(.headline)
            Spacer()
        }
    }

    private func infoRow(_ label: String, _ value: String) -> some View {
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

// MARK: - Card Style Modifier

extension View {
    func cardStyle() -> some View {
        self
            .padding(16)
            .background(.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
    }
}
