import SwiftUI
import Combine

@MainActor
final class AppState: ObservableObject {
    @Published var isLoggedIn: Bool = false
    @Published var isLoading: Bool = true
    @Published var currentUser: User?

    private let tokenStore = TokenStore.shared
    private let api = APIService.shared

    init() {
        checkAuth()
    }

    func checkAuth() {
        isLoading = true
        if let token = tokenStore.accessToken, !token.isEmpty {
            isLoggedIn = true
            if let userData = tokenStore.userData {
                currentUser = userData
            }
        } else {
            isLoggedIn = false
        }
        isLoading = false
    }

    func login(user: User, accessToken: String, refreshToken: String) {
        tokenStore.save(accessToken: accessToken, refreshToken: refreshToken, user: user)
        currentUser = user
        isLoggedIn = true
    }

    func logout() {
        tokenStore.clear()
        currentUser = nil
        isLoggedIn = false
    }
}
