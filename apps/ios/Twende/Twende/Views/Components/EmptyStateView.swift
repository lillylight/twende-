import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    var message: String = ""

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundColor(.textSecondary)
            Text(title)
                .font(.headline)
                .foregroundColor(.textPrimary)
            if !message.isEmpty {
                Text(message)
                    .font(.subheadline)
                    .foregroundColor(.textSecondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(40)
    }
}
