import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var phone = ""
    @Published var password = ""
    @Published var confirmPassword = ""
    @Published var name = ""
    @Published var otpCode = ""
    @Published var isLoading = false
    @Published var error: String?
    @Published var showPassword = false

    private let authRepo = AuthRepository.shared

    var formattedPhone: String {
        let digits = phone.filter { $0.isNumber }
        if digits.hasPrefix("0") {
            return "+26\(digits)"
        } else if digits.hasPrefix("26") {
            return "+\(digits)"
        }
        return "+260\(digits)"
    }

    var isLoginValid: Bool {
        phone.count >= 9 && password.count >= 6
    }

    var isRegisterValid: Bool {
        !name.isEmpty && phone.count >= 9 && password.count >= 6 && password == confirmPassword
    }

    func login(appState: AppState) async {
        isLoading = true
        error = nil
        do {
            let user = try await authRepo.login(phone: formattedPhone, password: password)
            appState.login(user: user, accessToken: TokenStore.shared.accessToken ?? "", refreshToken: TokenStore.shared.refreshToken ?? "")
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func register(appState: AppState) async {
        isLoading = true
        error = nil
        do {
            let user = try await authRepo.register(name: name, phone: formattedPhone, password: password)
            appState.login(user: user, accessToken: TokenStore.shared.accessToken ?? "", refreshToken: TokenStore.shared.refreshToken ?? "")
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func verifyOtp() async {
        isLoading = true
        error = nil
        do {
            try await authRepo.verifyOtp(phone: formattedPhone, code: otpCode)
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func clearError() {
        error = nil
    }
}
