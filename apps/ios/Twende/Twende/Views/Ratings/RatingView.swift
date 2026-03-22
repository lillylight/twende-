import SwiftUI

struct RatingView: View {
    let journeyId: String
    let driverId: String
    @StateObject private var vm = RatingViewModel()
    @Environment(\.dismiss) var dismiss

    let quickComments = [
        "Great driver!", "Smooth ride", "On time",
        "Safe driving", "Friendly", "Clean bus"
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 32) {
                if vm.isSubmitted {
                    // Success State
                    VStack(spacing: 16) {
                        Image(systemName: "star.circle.fill")
                            .font(.system(size: 64))
                            .foregroundColor(.twendeAmber)
                        Text("Thank You!")
                            .font(.title)
                            .fontWeight(.bold)
                        Text("Your feedback helps keep Zambian roads safe")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 48)

                    TwendeButton(title: "Done") {
                        dismiss()
                    }
                } else {
                    // Rating Form
                    VStack(spacing: 8) {
                        Text("Rate Your Trip")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("How was your experience?")
                            .font(.subheadline)
                            .foregroundColor(.textSecondary)
                    }
                    .padding(.top, 24)

                    // Stars
                    HStack(spacing: 12) {
                        ForEach(1...5, id: \.self) { star in
                            Button {
                                withAnimation(.spring(response: 0.3)) {
                                    vm.score = star
                                }
                            } label: {
                                Image(systemName: star <= vm.score ? "star.fill" : "star")
                                    .font(.system(size: 40))
                                    .foregroundColor(star <= vm.score ? .twendeAmber : Color(.systemGray4))
                                    .scaleEffect(star <= vm.score ? 1.1 : 1)
                            }
                        }
                    }

                    // Score label
                    if vm.score > 0 {
                        Text(scoreLabel)
                            .font(.subheadline)
                            .foregroundColor(.twendeAmber)
                            .fontWeight(.medium)
                    }

                    // Quick Comments
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Quick Feedback")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        FlowLayout(spacing: 8) {
                            ForEach(quickComments, id: \.self) { comment in
                                Button {
                                    vm.comment = vm.comment.isEmpty ? comment : "\(vm.comment), \(comment)"
                                } label: {
                                    Text(comment)
                                        .font(.caption)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 8)
                                        .background(Color(.systemGray6))
                                        .foregroundColor(.textPrimary)
                                        .cornerRadius(16)
                                }
                            }
                        }
                    }

                    // Comment
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Additional Comments")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                        TextEditor(text: $vm.comment)
                            .frame(minHeight: 80)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                    }

                    if let error = vm.error {
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.twendeRed)
                    }

                    TwendeButton(
                        title: "Submit Rating",
                        isLoading: vm.isLoading,
                        isDisabled: vm.score == 0
                    ) {
                        Task { await vm.submitRating(journeyId: journeyId, driverId: driverId) }
                    }
                }
            }
            .padding(24)
        }
        .background(Color.bgPrimary)
        .navigationTitle("Rate Trip")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var scoreLabel: String {
        switch vm.score {
        case 1: return "Poor"
        case 2: return "Fair"
        case 3: return "Good"
        case 4: return "Great"
        case 5: return "Excellent!"
        default: return ""
        }
    }
}

// Simple flow layout for chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = layout(subviews: subviews, width: proposal.width ?? 0)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = layout(subviews: subviews, width: bounds.width)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func layout(subviews: Subviews, width: CGFloat) -> (size: CGSize, positions: [CGPoint]) {
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > width && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxWidth = max(maxWidth, x)
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), positions)
    }
}
