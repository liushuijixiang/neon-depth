package com.dsh.neondepth;

import android.app.Application;
import android.os.Build;

public final class NeonApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 28 && !getPackageName().equals(Application.getProcessName())) return;
        CompatibilityMode.initialize(this);
    }
}
