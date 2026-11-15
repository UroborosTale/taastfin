package com.planer.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class TasksWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        manager.notifyAppWidgetViewDataChanged(widgetIds, R.id.widget_task_list);
        for (int id : widgetIds) manager.updateAppWidget(id, PlanerWidgetUpdater.taskViews(context, id));
    }
}
