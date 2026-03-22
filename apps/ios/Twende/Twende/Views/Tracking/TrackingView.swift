import SwiftUI
import MapKit

struct TrackingView: View {
    let journeyId: String
    @EnvironmentObject var router: Router
    @StateObject private var vm = TrackingViewModel()

    var body: some View {
        ZStack(alignment: .bottom) {
            // Map
            Map(coordinateRegion: $vm.region, annotationItems: busAnnotations) { item in
                MapAnnotation(coordinate: item.coordinate) {
                    Image(systemName: "bus.fill")
                        .font(.title2)
                        .foregroundColor(.white)
                        .padding(8)
                        .background(Color.twendeTeal)
                        .clipShape(Circle())
                        .shadow(radius: 4)
                }
            }
            .overlay(
                MapOverlay(coordinates: vm.routeCoordinates)
            )
            .ignoresSafeArea(edges: .top)

            // Bottom Info Sheet
            VStack(spacing: 16) {
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color(.systemGray4))
                    .frame(width: 40, height: 5)

                if let tracking = vm.tracking {
                    // Route Info
                    if let route = tracking.route {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(route.fromCity) → \(route.toCity)")
                                    .font(.headline)
                                Text("\(route.distanceKm) km")
                                    .font(.caption)
                                    .foregroundColor(.textSecondary)
                            }
                            Spacer()
                            if let eta = tracking.eta {
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text("ETA")
                                        .font(.caption)
                                        .foregroundColor(.textSecondary)
                                    Text(eta)
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundColor(.twendeTeal)
                                }
                            }
                        }
                    }

                    Divider()

                    // Speed & Details
                    HStack(spacing: 24) {
                        infoItem(icon: "speedometer", label: "Speed", value: vm.speedKmh)
                        if let driver = tracking.driver {
                            infoItem(icon: "person.fill", label: "Driver", value: driver.name ?? "-")
                        }
                        if let vehicle = tracking.vehicle {
                            infoItem(icon: "bus", label: "Bus", value: vehicle.registrationNumber)
                        }
                    }
                } else if vm.isLoading {
                    ProgressView("Loading tracking data...")
                } else if let error = vm.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.twendeRed)
                }
            }
            .padding(20)
            .background(.white)
            .cornerRadius(20, corners: [.topLeft, .topRight])
            .shadow(color: .black.opacity(0.1), radius: 8, y: -4)

            // SOS FAB
            VStack {
                HStack {
                    Spacer()
                    Button {
                        router.navigate(to: .sos(journeyId: journeyId))
                    } label: {
                        Image(systemName: "sos")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .frame(width: 56, height: 56)
                            .background(Color.twendeRed)
                            .clipShape(Circle())
                            .shadow(color: .twendeRed.opacity(0.4), radius: 8, y: 4)
                    }
                    .padding(.trailing, 20)
                }
                Spacer()
            }
            .padding(.top, 60)
        }
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { vm.startTracking(journeyId: journeyId) }
        .onDisappear { vm.stopTracking() }
    }

    private var busAnnotations: [BusAnnotation] {
        if let pos = vm.currentPosition {
            return [BusAnnotation(coordinate: pos)]
        }
        return []
    }

    private func infoItem(icon: String, label: String, value: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(.twendeTeal)
            Text(label)
                .font(.caption2)
                .foregroundColor(.textSecondary)
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(1)
        }
    }
}

struct BusAnnotation: Identifiable {
    let id = UUID()
    let coordinate: CLLocationCoordinate2D
}

// Custom corner radius modifier
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat
    var corners: UIRectCorner

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// Map polyline overlay
struct MapOverlay: View {
    let coordinates: [CLLocationCoordinate2D]

    var body: some View {
        // In iOS 17+ this would use MapPolyline; for now a placeholder overlay
        Color.clear
    }
}
