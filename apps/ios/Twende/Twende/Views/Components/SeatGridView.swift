import SwiftUI

struct SeatGridView: View {
    let seats: [SeatAvailability]
    @Binding var selectedSeat: Int?

    private let columns = 4
    private let aisleAfter = 2

    var body: some View {
        VStack(spacing: 12) {
            // Legend
            HStack(spacing: 16) {
                legendItem(color: .twendeTeal, label: "Selected")
                legendItem(color: Color(.systemGray5), label: "Available")
                legendItem(color: Color(.systemGray3), label: "Taken")
            }
            .font(.caption)

            // Driver row
            HStack {
                Spacer()
                Image(systemName: "steeringwheel")
                    .font(.title2)
                    .foregroundColor(.textSecondary)
                    .padding(8)
            }

            // Seat grid
            let rows = stride(from: 0, to: seats.count, by: columns)
            ForEach(Array(rows), id: \.self) { rowStart in
                HStack(spacing: 6) {
                    ForEach(0..<columns, id: \.self) { col in
                        let index = rowStart + col
                        if col == aisleAfter {
                            Spacer().frame(width: 20)
                        }
                        if index < seats.count {
                            seatButton(seats[index])
                        } else {
                            Color.clear.frame(width: 44, height: 44)
                        }
                    }
                }
            }
        }
        .padding()
    }

    private func seatButton(_ seat: SeatAvailability) -> some View {
        Button {
            if seat.isAvailable {
                selectedSeat = selectedSeat == seat.seatNumber ? nil : seat.seatNumber
            }
        } label: {
            Text("\(seat.seatNumber)")
                .font(.caption)
                .fontWeight(.medium)
                .frame(width: 44, height: 44)
                .background(seatColor(seat))
                .foregroundColor(seatTextColor(seat))
                .cornerRadius(8)
        }
        .disabled(!seat.isAvailable)
    }

    private func seatColor(_ seat: SeatAvailability) -> Color {
        if selectedSeat == seat.seatNumber { return .twendeTeal }
        return seat.isAvailable ? Color(.systemGray5) : Color(.systemGray3)
    }

    private func seatTextColor(_ seat: SeatAvailability) -> Color {
        if selectedSeat == seat.seatNumber { return .white }
        return seat.isAvailable ? .textPrimary : .textSecondary
    }

    private func legendItem(color: Color, label: String) -> some View {
        HStack(spacing: 4) {
            RoundedRectangle(cornerRadius: 4)
                .fill(color)
                .frame(width: 16, height: 16)
            Text(label)
                .foregroundColor(.textSecondary)
        }
    }
}
