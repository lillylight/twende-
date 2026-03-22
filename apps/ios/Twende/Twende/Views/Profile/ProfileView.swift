import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var showLogoutAlert = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Avatar & User Info
                VStack(spacing: 12) {
                    Circle()
                        .fill(Color.twendeTeal)
                        .frame(width: 80, height: 80)
                        .overlay(
                            Text(appState.currentUser?.initials ?? "U")
                                .font(.title)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                        )

                    Text(appState.currentUser?.displayName ?? "User")
                        .font(.title3)
                        .fontWeight(.bold)

                    Text(appState.currentUser?.phone ?? "")
                        .font(.subheadline)
                        .foregroundColor(.textSecondary)

                    if let email = appState.currentUser?.email {
                        Text(email)
                            .font(.caption)
                            .foregroundColor(.textSecondary)
                    }
                }
                .padding(.top, 24)

                // Menu Items
                VStack(spacing: 0) {
                    menuItem(icon: "phone.fill", title: "Emergency Contacts", color: .twendeRed)
                    Divider().padding(.leading, 52)
                    menuItem(icon: "bell.fill", title: "Notifications", color: .twendeAmber)
                    Divider().padding(.leading, 52)
                    menuItem(icon: "globe", title: "Language", color: .twendeTeal)
                    Divider().padding(.leading, 52)
                    menuItem(icon: "info.circle.fill", title: "About Twende", color: .textSecondary)
                    Divider().padding(.leading, 52)
                    menuItem(icon: "questionmark.circle.fill", title: "Help & Support", color: .twendeTeal)
                }
                .background(.white)
                .cornerRadius(16)
                .padding(.horizontal, 16)

                // Logout
                Button {
                    showLogoutAlert = true
                } label: {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text("Log Out")
                    }
                    .font(.headline)
                    .foregroundColor(.twendeRed)
                    .frame(maxWidth: .infinity)
                    .padding(16)
                    .background(.white)
                    .cornerRadius(16)
                }
                .padding(.horizontal, 16)

                // Version
                Text("Twende v1.0.0")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
                    .padding(.bottom, 24)
            }
        }
        .background(Color.bgPrimary)
        .navigationTitle("Profile")
        .alert("Log Out?", isPresented: $showLogoutAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Log Out", role: .destructive) {
                appState.logout()
            }
        } message: {
            Text("Are you sure you want to log out?")
        }
    }

    private func menuItem(icon: String, title: String, color: Color) -> some View {
        Button {
            // Navigation handled per item
        } label: {
            HStack(spacing: 16) {
                Image(systemName: icon)
                    .foregroundColor(color)
                    .frame(width: 24)
                Text(title)
                    .foregroundColor(.textPrimary)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.textSecondary)
            }
            .padding(16)
        }
    }
}
