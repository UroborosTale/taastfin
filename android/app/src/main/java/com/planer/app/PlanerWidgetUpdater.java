package com.planer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;

public final class PlanerWidgetUpdater {
    private PlanerWidgetUpdater() {}

    private static String money(float value) {
        return NumberFormat.getIntegerInstance(new Locale("ru", "RU")).format(Math.round(value)) + " ₽";
    }

    public static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static boolean isCurrent(SharedPreferences data) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        return today.equals(data.getString("dataDate", ""));
    }

    public static RemoteViews budgetViews(Context context) {
        SharedPreferences data = context.getSharedPreferences("planer_widget", Context.MODE_PRIVATE);
        boolean current = isCurrent(data);
        float spent = current ? data.getFloat("daySpent", 0f) : 0f;
        float limit = current ? data.getFloat("dayLimit", 0f) : 0f;
        float remaining = current ? data.getFloat("remaining", 0f) : 0f;
        boolean limitEnabled = current && data.getBoolean("limitEnabled", false);
        int progress = limitEnabled && limit > 0 ? Math.min(100, Math.round(spent / limit * 100)) : 0;
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_budget);
        views.setTextViewText(R.id.widget_remaining, limitEnabled && limit > 0 ? money(remaining) : "— ₽");
        views.setTextViewText(R.id.widget_spent, !current ? "Откройте Планер для синхронизации" : limitEnabled
            ? "Потрачено " + money(spent) + " из " + money(limit)
            : "Дневной лимит не задан");
        views.setProgressBar(R.id.widget_budget_progress, 100, progress, false);
        views.setOnClickPendingIntent(R.id.widget_budget_root, openApp(context));
        return views;
    }

    public static RemoteViews taskViews(Context context, int widgetId) {
        SharedPreferences data = context.getSharedPreferences("planer_widget", Context.MODE_PRIVATE);
        int count = 0;
        try { if (isCurrent(data)) count = new JSONArray(data.getString("tasks", "[]")).length(); } catch (Exception ignored) {}
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_tasks);
        views.setTextViewText(R.id.widget_task_count, String.valueOf(count));
        Intent service = new Intent(context, TasksWidgetService.class);
        service.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId);
        service.setData(Uri.parse(service.toUri(Intent.URI_INTENT_SCHEME)));
        views.setRemoteAdapter(R.id.widget_task_list, service);
        views.setEmptyView(R.id.widget_task_list, R.id.widget_tasks_empty);
        views.setOnClickPendingIntent(R.id.widget_tasks_empty, openApp(context));
        views.setPendingIntentTemplate(R.id.widget_task_list, openApp(context));
        views.setOnClickPendingIntent(R.id.widget_tasks_header, openApp(context));
        return views;
    }

    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] budgetIds = manager.getAppWidgetIds(new ComponentName(context, BudgetWidgetProvider.class));
        for (int id : budgetIds) manager.updateAppWidget(id, budgetViews(context));
        int[] taskIds = manager.getAppWidgetIds(new ComponentName(context, TasksWidgetProvider.class));
        manager.notifyAppWidgetViewDataChanged(taskIds, R.id.widget_task_list);
        for (int id : taskIds) manager.updateAppWidget(id, taskViews(context, id));
    }
}
