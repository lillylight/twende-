import SwiftUI

@MainActor
final class RatingViewModel: ObservableObject {
    @Published var score = 0
    @Published var comment = ""
    @Published var isLoading = false
    @Published var isSubmitted = false
    @Published var error: String?

    private let ratingRepo = RatingRepository.shared

    func submitRating(journeyId: String, driverId: String) async {
        guard score > 0 else {
            error = "Please select a rating"
            return
        }
        isLoading = true
        error = nil
        do {
            try await ratingRepo.submitRating(
                journeyId: journeyId,
                driverId: driverId,
                score: score,
                comment: comment.isEmpty ? nil : comment
            )
            isSubmitted = true
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }
}
