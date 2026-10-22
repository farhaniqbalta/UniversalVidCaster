import SafariServices

// Request/reply transport test only. No SDK, device discovery, or session owner.
final class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message = request?.userInfo?[SFExtensionMessageKey] as? [String: Any]
        let valid = message?["command"] as? String == "probe" && message?["version"] as? Int == 1
        let payload: [String: Any] = valid
            ? ["version": 1, "nativeMessaging": true, "castImplemented": false]
            : ["error": "Unsupported probe request", "castImplemented": false]
        let response = NSExtensionItem()
        response.userInfo = [SFExtensionMessageKey: payload]
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
