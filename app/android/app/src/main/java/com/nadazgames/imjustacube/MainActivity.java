package com.nadazgames.imjustacube;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The one plugin that lives in the app rather than in node_modules;
        // npm plugins are found by `cap sync`, this one has to be named.
        // Before super.onCreate(), which is where the bridge is built.
        registerPlugin(AchievementsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
