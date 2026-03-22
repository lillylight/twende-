import SwiftUI

@main
struct TwendeApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var router = Router()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(appState)
                .environmentObject(router)
                .tint(Color.twendeTeal)
        }
    }
}
