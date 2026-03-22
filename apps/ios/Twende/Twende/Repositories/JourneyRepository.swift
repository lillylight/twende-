import Foundation

final class JourneyRepository {
    static let shared = JourneyRepository()
    private let api = APIService.shared

    private init() {}

    func getRoutes() async throws -> [BusRoute] {
        let response: APIResponse<[BusRoute]> = try await api.get("routes")
        return response.data ?? []
    }

    func searchJourneys(routeId: String, date: String? = nil) async throws -> [Journey] {
        var query: [URLQueryItem] = [URLQueryItem(name: "routeId", value: routeId)]
        if let date = date {
            query.append(URLQueryItem(name: "date", value: date))
        }
        let response: PaginatedResponse<Journey> = try await api.get("journeys", queryItems: query)
        return response.data
    }

    func getSeats(journeyId: String) async throws -> [SeatAvailability] {
        let response: APIResponse<[SeatAvailability]> = try await api.get("journeys/\(journeyId)/seats")
        return response.data ?? []
    }

    func getJourneyTracking(journeyId: String) async throws -> JourneyTracking {
        let response: APIResponse<JourneyTracking> = try await api.get("tracking/journey/\(journeyId)")
        guard let data = response.data else {
            throw APIError.noData
        }
        return data
    }

    func getPublicTracking(token: String) async throws -> JourneyTracking {
        let response: APIResponse<JourneyTracking> = try await api.get("tracking/public/\(token)", authenticated: false)
        guard let data = response.data else {
            throw APIError.noData
        }
        return data
    }
}
