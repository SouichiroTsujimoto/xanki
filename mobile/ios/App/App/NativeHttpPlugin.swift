import Capacitor
import Foundation

@objc(NativeHttpPlugin)
public class NativeHttpPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeHttpPlugin"
    public let jsName = "NativeHttp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"), let url = URL(string: urlString) else {
            call.reject("Invalid url")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = call.getString("method") ?? "GET"

        if let headers = call.getObject("headers") {
            for (key, value) in headers {
                request.setValue(String(describing: value), forHTTPHeaderField: key)
            }
        }

        if let body = call.getString("body") {
            request.httpBody = body.data(using: .utf8)
        } else if let bodyBase64 = call.getString("bodyBase64"),
                  let data = Data(base64Encoded: bodyBase64) {
            request.httpBody = data
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error {
                call.reject(error.localizedDescription)
                return
            }

            let httpResponse = response as? HTTPURLResponse
            var headers = JSObject()
            httpResponse?.allHeaderFields.forEach { key, value in
                headers[String(describing: key)] = String(describing: value)
            }

            let payload = data ?? Data()
            var result: JSObject = [
                "status": httpResponse?.statusCode ?? 0,
                "headers": headers,
            ]

            if call.getString("responseType") == "base64" {
                result["bodyBase64"] = payload.base64EncodedString()
            } else {
                result["body"] = String(data: payload, encoding: .utf8) ?? ""
            }

            call.resolve(result)
        }.resume()
    }
}
