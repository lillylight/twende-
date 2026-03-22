import SwiftUI

struct OTPView: View {
    let phone: String
    @StateObject private var vm = AuthViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var resendTimer = 60

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 12) {
                Image(systemName: "lock.shield")
                    .font(.system(size: 48))
                    .foregroundColor(.twendeTeal)
                Text("Verify Your Number")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("Enter the 6-digit code sent to\n\(phone)")
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let error = vm.error {
                Text(error)
                    .font(.caption)
                    .foregroundColor(.twendeRed)
                    .padding(12)
                    .background(Color.twendeRed.opacity(0.1))
                    .cornerRadius(8)
            }

            // OTP Input
            HStack(spacing: 8) {
                ForEach(0..<6, id: \.self) { index in
                    let char = index < vm.otpCode.count
                        ? String(vm.otpCode[vm.otpCode.index(vm.otpCode.startIndex, offsetBy: index)])
                        : ""
                    Text(char)
                        .font(.title2)
                        .fontWeight(.bold)
                        .frame(width: 44, height: 52)
                        .background(Color(.systemGray6))
                        .cornerRadius(10)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(index < vm.otpCode.count ? Color.twendeTeal : Color(.systemGray4), lineWidth: 1.5)
                        )
                }
            }
            .overlay(
                TextField("", text: $vm.otpCode)
                    .keyboardType(.numberPad)
                    .foregroundColor(.clear)
                    .accentColor(.clear)
                    .onChange(of: vm.otpCode) { newValue in
                        if newValue.count > 6 {
                            vm.otpCode = String(newValue.prefix(6))
                        }
                    }
            )

            TwendeButton(title: "Verify", isLoading: vm.isLoading, isDisabled: vm.otpCode.count < 6) {
                Task {
                    await vm.verifyOtp()
                    if vm.error == nil {
                        dismiss()
                    }
                }
            }

            Button {
                // Resend OTP
                resendTimer = 60
            } label: {
                if resendTimer > 0 {
                    Text("Resend code in \(resendTimer)s")
                        .foregroundColor(.textSecondary)
                } else {
                    Text("Resend Code")
                        .fontWeight(.semibold)
                        .foregroundColor(.twendeTeal)
                }
            }
            .disabled(resendTimer > 0)
            .font(.subheadline)
            .onAppear {
                startTimer()
            }

            Spacer()
        }
        .padding(24)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func startTimer() {
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            if resendTimer > 0 {
                resendTimer -= 1
            } else {
                timer.invalidate()
            }
        }
    }
}
