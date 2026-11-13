import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidBecomeActive(_ notification: Notification) {
        (NSApplication.shared.keyWindow?.contentViewController as? ViewController)?.refreshState()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
