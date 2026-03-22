import SwiftUI

struct SOSView: View {
    let journeyId: String
    @StateObject private var vm = SOSViewModel()
    @Environment(\.dismiss) var dismiss
    @State private var holdProgress: CGFloat = 0
    @State private var isHolding = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            if vm.isActive {
                // Active SOS State
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 64))
                        .foregroundColor(.twendeRed)
                        .scaleEffect(pulseScale)
                        .animation(.easeInOut(duration: 1).repeatForever(), value: pulseScale)

                    Text("SOS ACTIVATED")
                        .font(.title)
                        .fontWeight(.bold)
                        .foregroundColor(.twendeRed)

                    Text("Help is on the way.\nEmergency services have been notified.")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)

                    if let response = vm.sosResponse {
                        Text(response.message ?? "Alert ID: \(response.id)")
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                            .padding(8)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }

                TwendeButton(title: "Cancel SOS", style: .secondary) {
                    Task { await vm.cancelSOS(journeyId: journeyId) }
                }

                // Emergency Call
                Button {
                    if let url = URL(string: "tel://999") {
                        UIApplication.shared.open(url)
                    }
                } label: {
                    Label("Call Emergency Services", systemImage: "phone.fill")
                        .font(.headline)
                        .foregroundColor(.twendeRed)
                }
            } else {
                // Trigger SOS State
                VStack(spacing: 16) {
                    Text("Emergency SOS")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("Hold the button below for 2 seconds\nto trigger an emergency alert")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)
                        .multilineTextAlignment(.center)
                }

                // SOS Button
                ZStack {
                    Circle()
                        .stroke(Color.twendeRed.opacity(0.2), lineWidth: 8)
                        .frame(width: 160, height: 160)

                    Circle()
                        .trim(from: 0, to: holdProgress)
                        .stroke(Color.twendeRed, lineWidth: 8)
                        .frame(width: 160, height: 160)
                        .rotationEffect(.degrees(-90))

                    Circle()
                        .fill(Color.twendeRed)
                        .frame(width: 140, height: 140)
                        .overlay(
                            VStack(spacing: 4) {
                                Image(systemName: "sos")
                                    .font(.system(size: 36, weight: .bold))
                                Text("HOLD")
                                    .font(.caption)
                                    .fontWeight(.bold)
                            }
                            .foregroundColor(.white)
                        )
                        .shadow(color: .twendeRed.opacity(0.4), radius: 12, y: 4)
                        .scaleEffect(isHolding ? 0.95 : 1)
                        .gesture(
                            LongPressGesture(minimumDuration: 2)
                                .onChanged { _ in
                                    isHolding = true
                                    withAnimation(.linear(duration: 2)) {
                                        holdProgress = 1
                                    }
                                }
                                .onEnded { _ in
                                    Task { await vm.triggerSOS(journeyId: journeyId) }
                                    isHolding = false
                                    holdProgress = 0
                                }
                        )
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onEnded { _ in
                                    if !vm.isActive {
                                        isHolding = false
                                        withAnimation { holdProgress = 0 }
                                    }
                                }
                        )
                }

                // Optional description
                TextField("What's happening? (optional)", text: $vm.description)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal, 24)

                if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                }
            }

            Spacer()
        }
        .padding(24)
        .navigationTitle("Emergency SOS")
        .navigationBarTitleDisplayMode(.inline)
    }

    @State private var pulseScale: CGFloat = 1.1
}
