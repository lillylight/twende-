import SwiftUI

struct RegisterView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()
    @Environment(\.dismiss) var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Create Account")
                        .font(.title)
                        .fontWeight(.bold)
                    Text("Join Twende for safe bus travel")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                .padding(.top, 24)

                if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(Color.twendeRed.opacity(0.1))
                        .cornerRadius(8)
                }

                VStack(spacing: 16) {
                    formField("Full Name", text: $vm.name, placeholder: "Your full name", keyboard: .default)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Phone Number")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        HStack {
                            Text("+260")
                                .foregroundColor(.textSecondary)
                                .padding(.leading, 12)
                            TextField("97XXXXXXX", text: $vm.phone)
                                .keyboardType(.phonePad)
                        }
                        .padding(.vertical, 12)
                        .padding(.trailing, 12)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Password")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        SecureField("At least 6 characters", text: $vm.password)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Confirm Password")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        SecureField("Re-enter password", text: $vm.confirmPassword)
                            .padding(12)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    if !vm.confirmPassword.isEmpty && vm.password != vm.confirmPassword {
                        Text("Passwords do not match")
                            .font(.caption)
                            .foregroundColor(.twendeRed)
                    }
                }

                TwendeButton(title: "Create Account", isLoading: vm.isLoading, isDisabled: !vm.isRegisterValid) {
                    Task { await vm.register(appState: appState) }
                }

                Button {
                    dismiss()
                } label: {
                    HStack(spacing: 4) {
                        Text("Already have an account?")
                            .foregroundColor(.textSecondary)
                        Text("Sign In")
                            .fontWeight(.semibold)
                            .foregroundColor(.twendeTeal)
                    }
                    .font(.subheadline)
                }
            }
            .padding(24)
        }
        .navigationBarTitleDisplayMode(.inline)
    }

    private func formField(_ label: String, text: Binding<String>, placeholder: String, keyboard: UIKeyboardType) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.caption)
                .foregroundColor(.textSecondary)
            TextField(placeholder, text: text)
                .keyboardType(keyboard)
                .padding(12)
                .background(Color(.systemGray6))
                .cornerRadius(12)
        }
    }
}
