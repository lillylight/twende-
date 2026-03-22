import SwiftUI
import MapKit
import Combine

@MainActor
final class TrackingViewModel: ObservableObject {
    @Published var tracking: JourneyTracking?
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: -15.4, longitude: 28.3),
        span: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)
    )
    @Published var isLoading = false
    @Published var error: String?

    private let journeyRepo = JourneyRepository.shared
    private var pollingTask: Task<Void, Never>?

    var currentPosition: CLLocationCoordinate2D? {
        guard let pos = tracking?.positions.last else { return nil }
        return CLLocationCoordinate2D(latitude: pos.latitude, longitude: pos.longitude)
    }

    var routeCoordinates: [CLLocationCoordinate2D] {
        tracking?.positions.map {
            CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
        } ?? []
    }

    var speedKmh: String {
        guard let speed = tracking?.currentSpeed else { return "--" }
        return "\(Int(speed)) km/h"
    }

    func startTracking(journeyId: String) {
        pollingTask?.cancel()
        pollingTask = Task {
            isLoading = true
            while !Task.isCancelled {
                do {
                    tracking = try await journeyRepo.getJourneyTracking(journeyId: journeyId)
                    if let pos = currentPosition {
                        region = MKCoordinateRegion(
                            center: pos,
                            span: MKCoordinateSpan(latitudeDelta: 0.02, longitudeDelta: 0.02)
                        )
                    }
                    error = nil
                } catch {
                    self.error = error.localizedDescription
                }
                isLoading = false
                try? await Task.sleep(nanoseconds: 5_000_000_000) // 5 seconds
            }
        }
    }

    func stopTracking() {
        pollingTask?.cancel()
        pollingTask = nil
    }
}
