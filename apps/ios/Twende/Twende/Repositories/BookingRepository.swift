import Foundation

final class BookingRepository {
    static let shared = BookingRepository()
    private let api = APIService.shared

    private init() {}

    func createBooking(_ request: BookingRequest) async throws -> Booking {
        let response: APIResponse<Booking> = try await api.post("bookings", body: request)
        guard let data = response.data else {
            throw APIError.serverError(400, response.message ?? "Booking failed")
        }
        return data
    }

    func getBookings() async throws -> [Booking] {
        let response: PaginatedResponse<Booking> = try await api.get("bookings")
        return response.data
    }

    func getBooking(reference: String) async throws -> Booking {
        let response: APIResponse<Booking> = try await api.get("bookings/\(reference)")
        guard let data = response.data else {
            throw APIError.noData
        }
        return data
    }

    func cancelBooking(reference: String) async throws {
        let _: APIResponse<Booking> = try await api.delete("bookings/\(reference)")
    }

    func checkIn(reference: String) async throws {
        let _: APIResponse<Booking> = try await api.post("bookings/\(reference)/check-in")
    }

    func getHistory(page: Int = 1, limit: Int = 20) async throws -> HistoryResponse {
        let query = [
            URLQueryItem(name: "page", value: "\(page)"),
            URLQueryItem(name: "limit", value: "\(limit)")
        ]
        let response: APIResponse<HistoryResponse> = try await api.get("journeys/history", queryItems: query)
        return response.data ?? HistoryResponse()
    }

    func initiatePayment(bookingReference: String, method: String, phone: String) async throws -> PaymentStatusResponse {
        let body = PaymentInitRequest(bookingReference: bookingReference, paymentMethod: method, phoneNumber: phone)
        let response: APIResponse<PaymentStatusResponse> = try await api.post("payments/initiate", body: body)
        guard let data = response.data else {
            throw APIError.serverError(400, response.message ?? "Payment initiation failed")
        }
        return data
    }

    func checkPaymentStatus(reference: String) async throws -> PaymentStatusResponse {
        let response: APIResponse<PaymentStatusResponse> = try await api.get("payments/\(reference)/status")
        guard let data = response.data else {
            throw APIError.noData
        }
        return data
    }
}
