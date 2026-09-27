import Capacitor
import GameKit

/* THE STORE'S ACHIEVEMENTS ON iOS: Game Center. Two calls, and
   js/27-achievements.js is the only caller:

     signIn()        -> {signedIn}  sign the player in to Game Center
     unlock({id})    -> {ok}        report one achievement at 100%

   It lives in the app rather than in an npm package because no maintained
   plugin fits Capacitor 7, and what is needed is two calls. A plugin in the
   app is not found by `cap sync`, so AppViewController registers it, and
   Main.storyboard names AppViewController instead of Capacitor's own.

   Game Center also needs its entitlement (App.entitlements) and the
   achievements created in App Store Connect under the ids in ACH_IDS.ios. */
@objc(AchievementsPlugin)
public class AchievementsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AchievementsPlugin"
    public let jsName = "Achievements"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "signIn", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise)
    ]

    /* Calls waiting for Game Center's answer. The handler can only be set
       once per launch - setting it IS the sign-in - so a second signIn()
       joins the first instead of starting another. */
    private var waiting: [CAPPluginCall] = []
    private var asked = false
    private var answered = false

    @objc func signIn(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let me = GKLocalPlayer.local
            if me.isAuthenticated || (self.asked && self.answered) {
                call.resolve(["signedIn": me.isAuthenticated])
                return
            }
            self.waiting.append(call)
            if self.asked { return }
            self.asked = true
            /* Apple's pattern: a player already signed in on this phone is
               signed in silently with a "Welcome back" banner; one who is not
               is handed a sign-in sheet, which we present. Cancelling it is
               an answer, and Game Center itself stops offering the sheet
               after a few cancels. */
            me.authenticateHandler = { [weak self] vc, _ in
                guard let self = self else { return }
                if let vc = vc {
                    self.bridge?.viewController?.present(vc, animated: true)
                    return
                }
                self.answered = true
                let ok = GKLocalPlayer.local.isAuthenticated
                let calls = self.waiting
                self.waiting = []
                for c in calls { c.resolve(["signedIn": ok]) }
            }
        }
    }

    @objc func unlock(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty,
              GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["ok": false])
            return
        }
        let a = GKAchievement(identifier: id)
        a.percentComplete = 100
        a.showsCompletionBanner = true
        GKAchievement.report([a]) { error in
            call.resolve(["ok": error == nil])
        }
    }
}
