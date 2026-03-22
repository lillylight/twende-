import Foundation

final class RatingRepository {
    static let shared = RatingRepository()
    private let api = APIService.shared

    private init() {}

    func submitRating(journeyId: String, driverId: String, score: Int, comment: String?) async throws {
        let body = RatingRequest(journeyId: journeyId, driverId: driverId, score: score, comment: comment)
        let _: APIResponse<Rating> = try await api.post("ratings", body: body)
    }

    func getDriverRating(driverId: String) async throws -> Double {
        let response: APIResponse<Rating> = try await api.get("drivers/\(driverId)/rating")
        return Double(response.data?.score ?? response.data?.stars ?? 0)
    }
}
