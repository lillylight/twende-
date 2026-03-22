import SwiftUI
import CoreLocation

@MainActor
final class SOSViewModel: ObservableObject {
    @Published var isActive = false
    @Published var isLoading = false
    @Published var description = ""
    @Published var error: String?
    @Published var sosResponse: SOSResponse?

    private let sosRepo = SOSRepository.shared
    private let locationManager = CLLocationManager()

    func triggerSOS(journeyId: String) async {
        isLoading = true
        error = nil

        let location = locationManager.location ?? CLLocation(latitude: -15.4167, longitude: 28.2833)

        do {
            sosResponse = try await sosRepo.triggerSOS(
                journeyId: journeyId,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude,
                description: description.isEmpty ? nil : description
            )
            isActive = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    func cancelSOS(journeyId: String) async {
        isLoading = true
        do {
            try await sosRepo.cancelSOS(journeyId: journeyId)
            isActive = false
            sosResponse = nil
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
