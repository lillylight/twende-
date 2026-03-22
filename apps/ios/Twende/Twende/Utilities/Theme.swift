import SwiftUI

// MARK: - Brand Colors

extension Color {
    static let twendeTeal = Color(red: 15/255, green: 110/255, blue: 86/255)
    static let twendeTealDark = Color(red: 10/255, green: 84/255, blue: 64/255)
    static let twendeAmber = Color(red: 239/255, green: 159/255, blue: 39/255)
    static let twendeRed = Color(red: 226/255, green: 75/255, blue: 74/255)
    static let twendeGreen = Color(red: 16/255, green: 185/255, blue: 129/255)
    static let textPrimary = Color(red: 17/255, green: 24/255, blue: 39/255)
    static let textSecondary = Color(red: 107/255, green: 114/255, blue: 128/255)
    static let bgPrimary = Color(red: 249/255, green: 250/255, blue: 251/255)
    static let airtelRed = Color(red: 237/255, green: 28/255, blue: 36/255)
    static let mtnYellow = Color(red: 255/255, green: 204/255, blue: 0/255)
    static let zamtelGreen = Color(red: 0/255, green: 166/255, blue: 81/255)
}

// MARK: - Status Badge

extension String {
    var statusColor: Color {
        switch self.lowercased() {
        case "confirmed", "active", "checked_in", "success":
            return .twendeGreen
        case "reserved", "pending", "initiated", "scheduled":
            return .twendeAmber
        case "cancelled", "failed", "expired":
            return .twendeRed
        case "completed":
            return .twendeTeal
        default:
            return .textSecondary
        }
    }

    var statusLabel: String {
        self.replacingOccurrences(of: "_", with: " ").uppercased()
    }
}

// MARK: - Kwacha Formatter

extension Double {
    var kwacha: String {
        "K\(String(format: "%.0f", self))"
    }

    var kwachaDetailed: String {
        "K\(String(format: "%.2f", self))"
    }
}
