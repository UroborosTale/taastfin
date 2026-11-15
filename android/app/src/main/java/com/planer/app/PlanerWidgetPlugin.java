package com.planer.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PlanerWidget")
public class PlanerWidgetPlugin extends Plugin {
    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences("planer_widget", Context.MODE_PRIVATE);
        JSArray tasks = call.getArray("tasks", new JSArray());
        preferences.edit()
            .putFloat("daySpent", call.getDouble("daySpent", 0.0).floatValue())
            .putFloat("dayLimit", call.getDouble("dayLimit", 0.0).floatValue())
            .putFloat("remaining", call.getDouble("remaining", 0.0).floatValue())
            .putString("dataDate", call.getString("dataDate", ""))
            .putString("tasks", tasks.toString())
            .apply();
        PlanerWidgetUpdater.updateAll(getContext());
        call.resolve();
    }
}
