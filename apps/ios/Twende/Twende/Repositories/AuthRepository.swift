import Foundation

final class AuthRepository {
    static let shared = AuthRepository()
    private let api = APIService.shared
    private let tokenStore = TokenStore.shared

    private init() {}

    func login(phone: String, password: String) async throws -> User {
        let body = LoginRequest(phone: phone, password: password)
        let response: APIResponse<AuthData> = try await api.post("auth/login", body: body, authenticated: false)
        guard let data = response.data else {
            throw APIError.serverError(400, response.message ?? "Login failed")
        }
        tokenStore.save(accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken, user: data.user)
        return data.user
    }

    func register(name: String, phone: String, password: String) async throws -> User {
        let body = RegisterRequest(phone: phone, password: password, name: name)
        let response: APIResponse<AuthData> = try await api.post("auth/register", body: body, authenticated: false)
        guard let data = response.data else {
            throw APIError.serverError(400, response.message ?? "Registration failed")
        }
        tokenStore.save(accessToken: data.tokens.accessToken, refreshToken: data.tokens.refreshToken, user: data.user)
        return data.user
    }

    func verifyOtp(phone: String, code: String) async throws {
        let body = OtpVerifyRequest(phone: phone, code: code)
        let _: APIResponse<EmptyResponse> = try await api.post("auth/verify-otp", body: body, authenticated: false)
    }

    func logout() {
        tokenStore.clear()
    }
}
