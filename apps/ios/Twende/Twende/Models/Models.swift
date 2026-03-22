import Foundation

// MARK: - Auth

struct LoginRequest: Codable {
    let phone: String
    let password: String
}

struct RegisterRequest: Codable {
    let phone: String
    let password: String
    let name: String
    let role: String

    init(phone: String, password: String, name: String, role: String = "PASSENGER") {
        self.phone = phone
        self.password = password
        self.name = name
        self.role = role
    }
}

struct OtpVerifyRequest: Codable {
    let phone: String
    let code: String
}

struct RefreshRequest: Codable {
    let refreshToken: String
}

struct AuthTokens: Codable {
    let accessToken: String
    let refreshToken: String
}

struct AuthData: Codable {
    let user: User
    let tokens: AuthTokens
}

struct User: Codable, Identifiable {
    let id: String
    let phone: String
    let firstName: String?
    let lastName: String?
    let name: String?
    let role: String
    let email: String?
    let isVerified: Bool?
    let createdAt: String?

    var displayName: String {
        if let name = name, !name.isEmpty { return name }
        let first = firstName ?? ""
        let last = lastName ?? ""
        let full = "\(first) \(last)".trimmingCharacters(in: .whitespaces)
        return full.isEmpty ? "User" : full
    }

    var initials: String {
        displayName.split(separator: " ")
            .prefix(2)
            .compactMap { $0.first?.uppercased() }
            .joined()
    }
}

// MARK: - Routes

struct BusRoute: Codable, Identifiable, Hashable {
    let id: String
    let fromCity: String
    let toCity: String
    let distanceKm: Int
    let estimatedDurationMinutes: Int
    let waypoints: String?
    let isActive: Bool?

    var origin: String { fromCity }
    var destination: String { toCity }
}

// MARK: - Vehicles, Drivers, Operators

struct Vehicle: Codable, Identifiable {
    let id: String
    let registrationNumber: String
    let capacity: Int
    let vehicleType: String?
    let isWheelchairAccessible: Bool?
    let isActive: Bool?
}

struct Driver: Codable, Identifiable {
    let id: String
    let name: String?
    let phone: String?
    let licenceNumber: String?
    let rating: Double?
    let totalTrips: Int?
}

struct Operator: Codable, Identifiable {
    let id: String
    let name: String
    let rtsaLicenceNumber: String?
    let contactPhone: String?
    let complianceScore: Double?
}

// MARK: - Journeys

struct Journey: Codable, Identifiable {
    let id: String
    let routeId: String
    let route: BusRoute?
    let driverId: String
    let driver: Driver?
    let vehicleId: String?
    let vehicle: Vehicle?
    let operatorId: String
    let `operator`: Operator?
    let departureTime: String
    let arrivalTime: String?
    let status: String
    let availableSeats: Int
    let totalSeats: Int
    let price: Double?
    let busRegistration: String?
    let trackingToken: String?
}

// MARK: - Bookings

struct BookingRequest: Codable {
    let journeyId: String
    let seatNumber: Int
    let paymentMethod: String
    let passengerName: String?
    let passengerPhone: String?
}

struct Booking: Codable, Identifiable {
    let id: String
    let reference: String
    let journeyId: String
    let journey: Journey?
    let userId: String
    let seatNumber: Int?
    let status: String
    let price: Double
    let paymentMethod: String?
    let paymentStatus: String
    let passengerName: String?
    let passengerPhone: String?
    let qrCode: String?
    let bookedVia: String?
    let checkedInAt: String?
    let cancelledAt: String?
    let createdAt: String?
    let updatedAt: String?
}

struct SeatAvailability: Codable, Identifiable {
    let seatNumber: Int
    let isAvailable: Bool

    var id: Int { seatNumber }
}

// MARK: - Ratings

struct RatingRequest: Codable {
    let journeyId: String
    let driverId: String
    let score: Int
    let comment: String?
}

struct Rating: Codable, Identifiable {
    let id: String
    let stars: Int?
    let score: Int?
    let comment: String?
    let createdAt: String?
}

// MARK: - SOS

struct SOSRequest: Codable {
    let journeyId: String
    let latitude: Double
    let longitude: Double
    let description: String?
}

struct SOSResponse: Codable {
    let id: String
    let status: String
    let message: String?
}

// MARK: - Tracking

struct TrackingPosition: Codable {
    let latitude: Double
    let longitude: Double
    let speed: Double?
    let heading: Double?
    let timestamp: String?
}

struct JourneyTracking: Codable {
    let journeyId: String
    let positions: [TrackingPosition]
    let currentSpeed: Double?
    let driver: Driver?
    let vehicle: Vehicle?
    let route: BusRoute?
    let eta: String?

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        journeyId = try container.decode(String.self, forKey: .journeyId)
        positions = try container.decodeIfPresent([TrackingPosition].self, forKey: .positions) ?? []
        currentSpeed = try container.decodeIfPresent(Double.self, forKey: .currentSpeed)
        driver = try container.decodeIfPresent(Driver.self, forKey: .driver)
        vehicle = try container.decodeIfPresent(Vehicle.self, forKey: .vehicle)
        route = try container.decodeIfPresent(BusRoute.self, forKey: .route)
        eta = try container.decodeIfPresent(String.self, forKey: .eta)
    }
}

// MARK: - Payments

struct PaymentInitRequest: Codable {
    let bookingReference: String
    let paymentMethod: String
    let phoneNumber: String
}

struct PaymentStatusResponse: Codable {
    let status: String
    let transactionId: String?
    let message: String?
}

// MARK: - History

struct SpendingSummary: Codable {
    let thisMonth: Double
    let thisYear: Double
    let allTime: Double

    init(thisMonth: Double = 0, thisYear: Double = 0, allTime: Double = 0) {
        self.thisMonth = thisMonth
        self.thisYear = thisYear
        self.allTime = allTime
    }
}

struct HistoryResponse: Codable {
    let bookings: [Booking]
    let total: Int
    let page: Int
    let limit: Int
    let spending: SpendingSummary?

    init(bookings: [Booking] = [], total: Int = 0, page: Int = 1, limit: Int = 20, spending: SpendingSummary? = nil) {
        self.bookings = bookings
        self.total = total
        self.page = page
        self.limit = limit
        self.spending = spending
    }
}

// MARK: - Generic Wrappers

struct APIError: Codable {
    let code: String?
    let message: String?
}

struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T?
    let error: APIError?
    let message: String?
    let timestamp: String?

    init(success: Bool = true, data: T? = nil, error: APIError? = nil, message: String? = nil, timestamp: String? = nil) {
        self.success = success
        self.data = data
        self.error = error
        self.message = message
        self.timestamp = timestamp
    }
}

struct PaginatedResponse<T: Codable>: Codable {
    let success: Bool
    let data: [T]
    let total: Int
    let page: Int
    let limit: Int
    let message: String?
    let timestamp: String?

    init(success: Bool = true, data: [T] = [], total: Int = 0, page: Int = 1, limit: Int = 20, message: String? = nil, timestamp: String? = nil) {
        self.success = success
        self.data = data
        self.total = total
        self.page = page
        self.limit = limit
        self.message = message
        self.timestamp = timestamp
    }
}
