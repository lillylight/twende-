import SwiftUI

struct SeatSelectionView: View {
    let journeyId: String
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var router: Router
    @StateObject private var vm = BookingViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Seat Grid
                VStack(alignment: .leading, spacing: 12) {
                    Text("Select Your Seat")
                        .font(.headline)
                    SeatGridView(seats: vm.seats, selectedSeat: $vm.selectedSeat)
                }
                .padding(16)
                .background(.white)
                .cornerRadius(16)

                // Payment Method
                VStack(alignment: .leading, spacing: 12) {
                    Text("Payment Method")
                        .font(.headline)
                    PaymentMethodPicker(selected: $vm.selectedPayment)
                }
                .padding(16)
                .background(.white)
                .cornerRadius(16)

                // Error
                if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                }

                // Book Button
                TwendeButton(
                    title: vm.selectedSeat != nil ? "Book Seat \(vm.selectedSeat!)" : "Select a Seat",
                    isLoading: vm.isLoading,
                    isDisabled: vm.selectedSeat == nil
                ) {
                    Task {
                        let user = appState.currentUser
                        if let booking = await vm.createBooking(
                            journeyId: journeyId,
                            passengerName: user?.displayName,
                            passengerPhone: user?.phone
                        ) {
                            router.navigate(to: .bookingConfirmation(reference: booking.reference))
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Choose Seat")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.loadSeats(journeyId: journeyId) }
    }
}
