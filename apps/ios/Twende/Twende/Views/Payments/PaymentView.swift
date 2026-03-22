import SwiftUI

struct PaymentView: View {
    let reference: String
    let method: String
    @StateObject private var vm = PaymentViewModel()
    @EnvironmentObject var router: Router

    private var paymentMethod: PaymentMethod? {
        PaymentMethod.all.first { $0.id == method }
    }

    var body: some View {
        VStack(spacing: 24) {
            switch vm.state {
            case .idle:
                idleView
            case .processing:
                processingView
            case .success:
                successView
            case .failed:
                failedView
            }
        }
        .padding(24)
        .background(Color.bgPrimary)
        .navigationTitle("Payment")
        .navigationBarTitleDisplayMode(.inline)
        .onDisappear { vm.stopPolling() }
    }

    // MARK: - Idle

    private var idleView: some View {
        VStack(spacing: 24) {
            Spacer()

            // Provider Branding
            if let pm = paymentMethod {
                VStack(spacing: 12) {
                    Circle()
                        .fill(pm.color)
                        .frame(width: 64, height: 64)
                        .overlay(
                            Image(systemName: pm.icon)
                                .font(.title2)
                                .foregroundColor(.white)
                        )
                    Text(pm.name)
                        .font(.title3)
                        .fontWeight(.bold)
                    Text("Booking: \(reference)")
                        .font(.caption)
                        .foregroundColor(.textSecondary)
                }
            }

            // Phone Input
            VStack(alignment: .leading, spacing: 6) {
                Text("Mobile Money Number")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                HStack {
                    Text("+260")
                        .foregroundColor(.textSecondary)
                        .padding(.leading, 12)
                    TextField("97XXXXXXX", text: $vm.phoneNumber)
                        .keyboardType(.phonePad)
                }
                .padding(.vertical, 12)
                .padding(.trailing, 12)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }

            if let error = vm.error {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.twendeRed)
            }

            TwendeButton(title: "Pay Now", isLoading: vm.state == .processing) {
                Task { await vm.initiatePayment(reference: reference, method: method) }
            }

            Spacer()
        }
    }

    // MARK: - Processing

    private var processingView: some View {
        VStack(spacing: 24) {
            Spacer()

            ProgressView()
                .scaleEffect(1.5)

            Text("Processing Payment")
                .font(.title3)
                .fontWeight(.bold)

            Text("Check your phone for the mobile money prompt.\nApprove the payment to complete.")
                .font(.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            // Countdown
            Text(timeString(vm.countdown))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.twendeAmber)
                .monospacedDigit()

            Spacer()
        }
    }

    // MARK: - Success

    private var successView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundColor(.twendeGreen)

            Text("Payment Successful!")
                .font(.title2)
                .fontWeight(.bold)

            Text("Your booking has been confirmed")
                .font(.subheadline)
                .foregroundColor(.textSecondary)

            TwendeButton(title: "View Booking") {
                router.popToRoot()
                router.navigate(to: .bookingDetail(reference: reference))
            }

            Spacer()
        }
    }

    // MARK: - Failed

    private var failedView: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "xmark.circle.fill")
                .font(.system(size: 72))
                .foregroundColor(.twendeRed)

            Text("Payment Failed")
                .font(.title2)
                .fontWeight(.bold)

            Text(vm.error ?? "Something went wrong. Please try again.")
                .font(.subheadline)
                .foregroundColor(.textSecondary)
                .multilineTextAlignment(.center)

            TwendeButton(title: "Try Again") {
                vm.state = .idle
                vm.error = nil
                vm.countdown = 300
            }

            TwendeButton(title: "Back to Booking", style: .secondary) {
                router.pop()
            }

            Spacer()
        }
    }

    private func timeString(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
