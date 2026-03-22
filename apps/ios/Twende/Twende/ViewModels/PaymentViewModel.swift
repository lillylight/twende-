import SwiftUI

@MainActor
final class PaymentViewModel: ObservableObject {
    enum PaymentState {
        case idle, processing, success, failed
    }

    @Published var state: PaymentState = .idle
    @Published var phoneNumber = ""
    @Published var error: String?
    @Published var countdown = 300 // 5 minutes

    private let bookingRepo = BookingRepository.shared
    private var pollingTask: Task<Void, Never>?

    func initiatePayment(reference: String, method: String) async {
        guard !phoneNumber.isEmpty else {
            error = "Enter your mobile money number"
            return
        }
        state = .processing
        error = nil

        do {
            _ = try await bookingRepo.initiatePayment(
                bookingReference: reference,
                method: method,
                phone: phoneNumber
            )
            startPolling(reference: reference)
        } catch {
            self.error = error.localizedDescription
            state = .failed
        }
    }

    private func startPolling(reference: String) {
        pollingTask?.cancel()
        pollingTask = Task {
            while !Task.isCancelled && countdown > 0 {
                try? await Task.sleep(nanoseconds: 3_000_000_000)
                do {
                    let status = try await bookingRepo.checkPaymentStatus(reference: reference)
                    switch status.status.uppercased() {
                    case "SUCCESS", "COMPLETED":
                        state = .success
                        pollingTask?.cancel()
                        return
                    case "FAILED", "EXPIRED":
                        state = .failed
                        error = status.message
                        pollingTask?.cancel()
                        return
                    default:
                        break
                    }
                } catch {
                    // Continue polling on error
                }
                countdown -= 3
            }
            if state == .processing {
                state = .failed
                error = "Payment timed out"
            }
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }
}
