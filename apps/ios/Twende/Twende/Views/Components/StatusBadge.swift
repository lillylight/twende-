import SwiftUI

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(status.statusLabel)
            .font(.caption2)
            .fontWeight(.bold)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(status.statusColor.opacity(0.15))
            .foregroundColor(status.statusColor)
            .cornerRadius(8)
    }
}
