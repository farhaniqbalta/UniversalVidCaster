// Compile-only feasibility probe. Never runs discovery or claims Safari support.
import Foundation
import GoogleCast

@MainActor
func probeExtensionAPI() {
    let criteria = GCKDiscoveryCriteria(applicationID: kGCKDefaultMediaReceiverApplicationID)
    let options = GCKCastOptions(discoveryCriteria: criteria)
    options.disableDiscoveryAutostart = true
    GCKCastContext.setSharedInstanceWith(options)
    let context = GCKCastContext.sharedInstance()
    context.discoveryManager.startDiscovery()
    context.discoveryManager.stopDiscovery()
}
