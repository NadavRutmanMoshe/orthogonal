package com.nadazgames.imjustacube;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

/* THE STORE'S ACHIEVEMENTS ON ANDROID: Google Play Games Services v2.
   Two calls, and js/27-achievements.js is the only caller:

     signIn()        -> {signedIn}  is this player signed in to Play Games
     unlock({id})    -> {ok}        tell Play one achievement is unlocked

   It lives in the app rather than in an npm package because no maintained
   plugin fits Capacitor 7 (the ones that exist are 0.x and need 8), and what
   is needed is two calls. MainActivity registers it.

   NOT SET UP IS NOT AN ERROR. Until Play Console has made a Games Services
   project and its id is in res/values/strings.xml, `game_services_project_id`
   is empty, and then the SDK is never started and every call answers "no".
   That matters because the SDK's own start-up, with no id, is the "fatal
   developer error" crash - which is also why its automatic start-up
   (PlayGamesInitProvider) is removed in AndroidManifest.xml and started here
   by hand instead, only when there is an id to start it with. */
@CapacitorPlugin(name = "Achievements")
public class AchievementsPlugin extends Plugin {
    private boolean ready = false;

    @Override
    public void load() {
        if (!configured()) return;
        try {
            PlayGamesSdk.initialize(getContext());
            ready = true;
        } catch (Exception e) {
            ready = false;
        }
    }

    /* The manifest's APP_ID, read back: present, non-empty and a number.
       Bundle.get() is deprecated, and kept: the value is a String from the
       string resource, but an Integer if anybody types the number in. */
    @SuppressWarnings("deprecation")
    private boolean configured() {
        try {
            ApplicationInfo ai = getContext().getPackageManager().getApplicationInfo(
                getContext().getPackageName(), PackageManager.GET_META_DATA);
            Bundle md = ai.metaData;
            Object v = md == null ? null : md.get("com.google.android.gms.games.APP_ID");
            String s = v == null ? "" : String.valueOf(v).trim();
            return s.matches("[0-9]+") && !s.equals("0");
        } catch (Exception e) {
            return false;
        }
    }

    /* Play Games v2 signs the player in by itself at launch, so this only
       asks. It never puts up a sign-in screen: somebody who declined Play
       Games once is not asked again from inside a game about a cube. */
    @PluginMethod
    public void signIn(PluginCall call) {
        if (!ready || getActivity() == null) {
            JSObject r = new JSObject();
            r.put("signedIn", false);
            call.resolve(r);
            return;
        }
        PlayGames.getGamesSignInClient(getActivity()).isAuthenticated()
            .addOnCompleteListener(t -> {
                JSObject r = new JSObject();
                r.put("signedIn", t.isSuccessful() && t.getResult() != null
                                  && t.getResult().isAuthenticated());
                call.resolve(r);
            });
    }

    /* unlock() rather than unlockImmediate(): Play queues it and sends it
       when there is a connection, so an achievement earned on a train is
       not lost. Answering ok as soon as it is queued is therefore honest. */
    @PluginMethod
    public void unlock(PluginCall call) {
        String id = call.getString("id");
        JSObject r = new JSObject();
        if (!ready || getActivity() == null || id == null || id.isEmpty()) {
            r.put("ok", false);
            call.resolve(r);
            return;
        }
        try {
            PlayGames.getAchievementsClient(getActivity()).unlock(id);
            r.put("ok", true);
        } catch (Exception e) {
            r.put("ok", false);
        }
        call.resolve(r);
    }
}
