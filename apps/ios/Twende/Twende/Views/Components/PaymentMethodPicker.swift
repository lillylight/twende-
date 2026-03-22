import SwiftUI

struct PaymentMethod: Identifiable {
    let id: String
    let name: String
    let color: Color
    let icon: String

    static let all: [PaymentMethod] = [
        PaymentMethod(id: "AIRTEL_MONEY", name: "Airtel Money", color: .airtelRed, icon: "phone.fill"),
        PaymentMethod(id: "MTN_MOMO", name: "MTN MoMo", color: .mtnYellow, icon: "phone.fill"),
        PaymentMethod(id: "ZAMTEL_KWACHA", name: "Zamtel Kwacha", color: .zamtelGreen, icon: "phone.fill"),
    ]
}

struct PaymentMethodPicker: View {
    @Binding var selected: String

    var body: some View {
        VStack(spacing: 8) {
            ForEach(PaymentMethod.all) { method in
                Button {
                    selected = method.id
                } label: {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(method.color)
                            .frame(width: 36, height: 36)
                            .overlay(
                                Image(systemName: method.icon)
                                    .font(.caption)
                                    .foregroundColor(.white)
                            )
                        Text(method.name)
                            .foregroundColor(.textPrimary)
                        Spacer()
                        Image(systemName: selected == method.id ? "checkmark.circle.fill" : "circle")
                            .foregroundColor(selected == method.id ? .twendeTeal : .textSecondary)
                    }
                    .padding(12)
                    .background(selected == method.id ? Color.twendeTeal.opacity(0.08) : Color(.systemGray6))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(selected == method.id ? Color.twendeTeal : Color.clear, lineWidth: 1.5)
                    )
                }
            }
        }
    }
}
