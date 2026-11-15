package com.planer.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService.RemoteViewsFactory;
import org.json.JSONArray;
import org.json.JSONObject;

public class TasksWidgetFactory implements RemoteViewsFactory {
    private final Context context;
    private JSONArray tasks = new JSONArray();

    public TasksWidgetFactory(Context context) { this.context = context; }

    private void loadTasks() {
        SharedPreferences data = context.getSharedPreferences("planer_widget", Context.MODE_PRIVATE);
        try { tasks = PlanerWidgetUpdater.isCurrent(data) ? new JSONArray(data.getString("tasks", "[]")) : new JSONArray(); } catch (Exception error) { tasks = new JSONArray(); }
    }

    @Override public void onCreate() { loadTasks(); }
    @Override public void onDataSetChanged() { loadTasks(); }
    @Override public void onDestroy() {}
    @Override public int getCount() { return tasks.length(); }
    @Override public long getItemId(int position) { return position; }
    @Override public boolean hasStableIds() { return false; }
    @Override public int getViewTypeCount() { return 1; }
    @Override public RemoteViews getLoadingView() { return null; }

    @Override
    public RemoteViews getViewAt(int position) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_task_item);
        try {
            JSONObject task = tasks.getJSONObject(position);
            views.setTextViewText(R.id.widget_task_title, task.optString("title"));
            String details = task.optString("time") + "  ·  " + task.optString("project");
            views.setTextViewText(R.id.widget_task_details, details);
        } catch (Exception error) {
            views.setTextViewText(R.id.widget_task_title, "Не удалось загрузить задачу");
            views.setTextViewText(R.id.widget_task_details, "Откройте Планер");
        }
        views.setOnClickFillInIntent(R.id.widget_task_item_root, new Intent());
        return views;
    }
}
