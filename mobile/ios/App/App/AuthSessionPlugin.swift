import AuthenticationServices
import Capacitor
import UIKit

@objc(AuthSessionPlugin)
public class AuthSessionPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AuthSessionPlugin"
    public let jsName = "AuthSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openAuthSession", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?

    @objc func openAuthSession(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Invalid url")
            return
        }

        bridge?.saveCall(call)
        guard let callbackId = call.callbackId else {
            call.reject("Missing callback id")
            return
        }
        let scheme = call.getString("callbackScheme") ?? "xanki"

        authSession = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { [weak self] callbackURL, error in
            DispatchQueue.main.async {
                guard let self, let savedCall = self.bridge?.getSavedCall(callbackId) else {
                    return
                }
                defer {
                    self.bridge?.releaseCall(savedCall)
                    self.authSession = nil
                }

                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    savedCall.reject("canceled", "USER_CANCELED")
                    return
                }

                guard let callbackURL else {
                    savedCall.reject(error?.localizedDescription ?? "No callback URL")
                    return
                }

                savedCall.resolve(["url": callbackURL.absoluteString])
            }
        }

        authSession?.presentationContextProvider = self
        authSession?.prefersEphemeralWebBrowserSession = false

        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            guard let session = self.authSession, session.start() else {
                self.authSession = nil
                if let savedCall = self.bridge?.getSavedCall(callbackId) {
                    self.bridge?.releaseCall(savedCall)
                    savedCall.reject("Failed to start auth session")
                }
                return
            }
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.flatMap(\.windows).first(where: \.isKeyWindow) ?? ASPresentationAnchor()
    }
}
