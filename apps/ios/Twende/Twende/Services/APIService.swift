import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(Int, String?)
    case unauthorized
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .noData: return "No data received"
        case .decodingError(let error): return "Decoding error: \(error.localizedDescription)"
        case .serverError(_, let message): return message ?? "Server error"
        case .unauthorized: return "Session expired. Please log in again."
        case .networkError(let error): return error.localizedDescription
        }
    }
}

final class APIService {
    static let shared = APIService()

    #if DEBUG
    private let baseURL = "http://localhost:3000/api"
    #else
    private let baseURL = "https://twende.zm/api"
    #endif

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        session = URLSession(configuration: config)

        decoder = JSONDecoder()
        encoder = JSONEncoder()
    }

    // MARK: - Core Request

    func request<T: Codable>(
        _ method: String,
        path: String,
        body: (any Encodable)? = nil,
        queryItems: [URLQueryItem]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard var components = URLComponents(string: "\(baseURL)/\(path)") else {
            throw APIError.invalidURL
        }

        if let queryItems = queryItems, !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if authenticated, let token = TokenStore.shared.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.noData
            }

            if httpResponse.statusCode == 401 && authenticated {
                // Try token refresh
                if try await refreshToken() {
                    // Retry with new token
                    if let newToken = TokenStore.shared.accessToken {
                        request.setValue("Bearer \(newToken)", forHTTPHeaderField: "Authorization")
                    }
                    let (retryData, retryResponse) = try await session.data(for: request)
                    guard let retryHttp = retryResponse as? HTTPURLResponse else {
                        throw APIError.noData
                    }
                    if retryHttp.statusCode == 401 {
                        throw APIError.unauthorized
                    }
                    return try decodeResponse(retryData, statusCode: retryHttp.statusCode)
                } else {
                    throw APIError.unauthorized
                }
            }

            return try decodeResponse(data, statusCode: httpResponse.statusCode)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    // MARK: - Convenience Methods

    func get<T: Codable>(_ path: String, queryItems: [URLQueryItem]? = nil, authenticated: Bool = true) async throws -> T {
        try await request("GET", path: path, queryItems: queryItems, authenticated: authenticated)
    }

    func post<T: Codable>(_ path: String, body: (any Encodable)? = nil, authenticated: Bool = true) async throws -> T {
        try await request("POST", path: path, body: body, authenticated: authenticated)
    }

    func put<T: Codable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("PUT", path: path, body: body)
    }

    func patch<T: Codable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request("PATCH", path: path, body: body)
    }

    func delete<T: Codable>(_ path: String) async throws -> T {
        try await request("DELETE", path: path)
    }

    // MARK: - Token Refresh

    private func refreshToken() async throws -> Bool {
        guard let refreshToken = TokenStore.shared.refreshToken else { return false }

        let body = RefreshRequest(refreshToken: refreshToken)
        guard let url = URL(string: "\(baseURL)/auth/refresh") else { return false }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else { return false }

        if let apiResponse = try? decoder.decode(APIResponse<AuthTokens>.self, from: data),
           let tokens = apiResponse.data {
            TokenStore.shared.accessToken = tokens.accessToken
            TokenStore.shared.refreshToken = tokens.refreshToken
            return true
        }
        return false
    }

    // MARK: - Decode Helper

    private func decodeResponse<T: Codable>(_ data: Data, statusCode: Int) throws -> T {
        guard (200...299).contains(statusCode) else {
            let message = (try? decoder.decode(APIResponse<EmptyResponse>.self, from: data))?.message
            throw APIError.serverError(statusCode, message)
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Helpers

struct EmptyResponse: Codable {}

struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        _encode = wrapped.encode
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
