import SwiftUI

struct LoginView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()
    @State private var navigateToRegister = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "bus.fill")
                        .font(.system(size: 56))
                        .foregroundColor(.twendeTeal)
                    Text("Twende")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.twendeTeal)
                    Text("Safe rides across Zambia")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                }
                .padding(.top, 48)

                // Error
                if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(Color.twendeRed.opacity(0.1))
                        .cornerRadius(8)
                }

                // Form
                VStack(spacing: 16) {
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
                        HStack {
                            if vm.showPassword {
                                TextField("Enter password", text: $vm.password)
                            } else {
                                SecureField("Enter password", text: $vm.password)
                            }
                            Button {
                                vm.showPassword.toggle()
                            } label: {
                                Image(systemName: vm.showPassword ? "eye.slash" : "eye")
                                    .foregroundColor(.textSecondary)
                            }
                        }
                        .padding(12)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                }

                TwendeButton(title: "Sign In", isLoading: vm.isLoading, isDisabled: !vm.isLoginValid) {
                    Task { await vm.login(appState: appState) }
                }

                Button {
                    navigateToRegister = true
                } label: {
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundColor(.textSecondary)
                        Text("Sign Up")
                            .fontWeight(.semibold)
                            .foregroundColor(.twendeTeal)
                    }
                    .font(.subheadline)
                }
            }
            .padding(24)
        }
        .navigationDestination(isPresented: $navigateToRegister) {
            RegisterView()
        }
        .onChange(of: vm.error) { _ in }
    }
}
