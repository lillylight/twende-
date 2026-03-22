import Foundation
import Security

final class TokenStore {
    static let shared = TokenStore()

    private let defaults = UserDefaults.standard
    private let accessTokenKey = "com.twende.accessToken"
    private let refreshTokenKey = "com.twende.refreshToken"
    private let userDataKey = "com.twende.userData"

    private init() {}

    // MARK: - Tokens

    var accessToken: String? {
        get { getKeychainItem(key: accessTokenKey) }
        set {
            if let value = newValue {
                setKeychainItem(key: accessTokenKey, value: value)
            } else {
                deleteKeychainItem(key: accessTokenKey)
            }
        }
    }

    var refreshToken: String? {
        get { getKeychainItem(key: refreshTokenKey) }
        set {
            if let value = newValue {
                setKeychainItem(key: refreshTokenKey, value: value)
            } else {
                deleteKeychainItem(key: refreshTokenKey)
            }
        }
    }

    // MARK: - User

    var userData: User? {
        get {
            guard let data = defaults.data(forKey: userDataKey) else { return nil }
            return try? JSONDecoder().decode(User.self, from: data)
        }
        set {
            if let user = newValue, let data = try? JSONEncoder().encode(user) {
                defaults.set(data, forKey: userDataKey)
            } else {
                defaults.removeObject(forKey: userDataKey)
            }
        }
    }

    // MARK: - Convenience

    func save(accessToken: String, refreshToken: String, user: User) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.userData = user
    }

    func clear() {
        accessToken = nil
        refreshToken = nil
        userData = nil
    }

    var isLoggedIn: Bool {
        accessToken != nil
    }

    // MARK: - Keychain Helpers

    private func setKeychainItem(key: String, value: String) {
        let data = value.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
        ]
        SecItemAdd(attributes as CFDictionary, nil)
    }

    private func getKeychainItem(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private func deleteKeychainItem(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
