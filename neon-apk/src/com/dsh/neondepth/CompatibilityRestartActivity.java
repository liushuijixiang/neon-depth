package com.dsh.neondepth;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.os.Process;
import android.util.Log;

/** Runs in a temporary app process so the main process can start fresh. */
public final class CompatibilityRestartActivity extends Activity {
    static final String MAIN_PID = "main_process_id";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int previousPid = getIntent().getIntExtra(MAIN_PID, -1);
        if (previousPid <= 0 || previousPid == Process.myPid()) {
            finish();
            return;
        }
        Process.killProcess(previousPid);
        try {
            Intent launch = Intent.makeRestartActivityTask(new ComponentName(this, MainActivity.class));
            startActivity(launch);
        } catch (RuntimeException error) {
            Log.e("NeonDepth", "Compatibility relaunch failed", error);
        } finally {
            finish();
            Process.killProcess(Process.myPid());
        }
    }
}
