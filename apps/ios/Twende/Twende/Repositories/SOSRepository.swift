import Foundation

final class SOSRepository {
    static let shared = SOSRepository()
    private let api = APIService.shared

    private init() {}

    func triggerSOS(journeyId: String, latitude: Double, longitude: Double, description: String?) async throws -> SOSResponse {
        let body = SOSRequest(journeyId: journeyId, latitude: latitude, longitude: longitude, description: description)
        let response: APIResponse<SOSResponse> = try await api.post("sos/\(journeyId)", body: body)
        guard let data = response.data else {
            throw APIError.serverError(400, response.message ?? "SOS failed")
        }
        return data
    }

    func cancelSOS(journeyId: String) async throws {
        let _: APIResponse<EmptyResponse> = try await api.delete("sos/\(journeyId)")
    }
}
