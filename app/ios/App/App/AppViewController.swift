import Capacitor

/* Capacitor's own view controller, with the one plugin that lives in the app
   registered on it. npm plugins are found by `cap sync`; this one is not, so
   it is named here. Main.storyboard points at this class. */
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AchievementsPlugin())
    }
}
