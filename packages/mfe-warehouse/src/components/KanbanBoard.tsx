import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useWebSocket from "react-use-websocket";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClipboardList } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const COLUMNS = ["PICK", "PACK", "DISPATCH", "COMPLETED"];

// Kanban Card Component
function SortableTaskCard({ task }: { task: any }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-slate-800 border ${isDragging ? "border-indigo-500 shadow-xl shadow-indigo-500/20 z-50" : "border-slate-700 hover:border-slate-600"} rounded-xl p-4 mb-3 cursor-grab active:cursor-grabbing transition-colors`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-slate-400">
          #{task.id.slice(0, 8)}
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
            task.priority === "HIGH"
              ? "bg-rose-500/20 text-rose-400"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {task.priority || "NORMAL"}
        </span>
      </div>
      <h4 className="font-bold text-slate-200 text-sm mb-1">
        {task.customerName || "Unknown Customer"}
      </h4>
      <p className="text-xs text-slate-400">
        Order: {task.orderId?.slice(0, 8)}
      </p>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ title, tasks }: { title: string; tasks: any[] }) {
  return (
    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col h-full min-h-[400px]">
      <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase text-sm tracking-wider">
        <div
          className={`w-2 h-2 rounded-full ${
            title === "PICK"
              ? "bg-amber-400"
              : title === "PACK"
                ? "bg-indigo-400"
                : title === "DISPATCH"
                  ? "bg-emerald-400"
                  : "bg-slate-400"
          }`}
        />
        {title}
        <span className="ml-auto bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-400">
          {tasks.length}
        </span>
      </h3>

      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 overflow-y-auto pr-1 -mr-1">
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-sm">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main Kanban Board Component
export default function KanbanBoard() {
  const queryClient = useQueryClient();

  const WS_URL = API_URL
    ? API_URL.replace(/^http/, "ws") + "/api/warehouse/ws"
    : `ws://${window.location.host}/api/warehouse/ws`;

  useWebSocket(WS_URL, {
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        const taskObj = data.task || data.payload?.task || data.payload;
        if (data.type === "TASK_UPDATED" && taskObj) {
          queryClient.setQueryData(["warehouse-tasks"], (old: any[]) => {
            if (!old) return old;
            return old.map((task) =>
              task.id === taskObj.id
                ? { ...task, status: taskObj.status }
                : task,
            );
          });
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const { data: tasksData = [], isLoading } = useQuery({
    queryKey: ["warehouse-tasks"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/warehouse/tasks`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`${API_URL}/api/warehouse/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      return res.json();
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["warehouse-tasks"] });
      const previousTasks = queryClient.getQueryData(["warehouse-tasks"]);
      queryClient.setQueryData(["warehouse-tasks"], (old: any[]) =>
        old?.map((task) => (task.id === id ? { ...task, status } : task)),
      );
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(["warehouse-tasks"], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-tasks"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasksData.find((t: any) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping over a column or another task
    let targetStatus = activeTask.status;

    // If dropping over another task, find its status
    const overTask = tasksData.find((t: any) => t.id === overId);
    if (overTask) {
      targetStatus = overTask.status;
    } else if (COLUMNS.includes(overId)) {
      // If dropping over a column area
      targetStatus = overId;
    }

    if (activeTask.status !== targetStatus) {
      updateTaskMutation.mutate({ id: activeId, status: targetStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-full space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-400" />
          Order Fulfillment Workflow
        </h2>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
          {COLUMNS.map((columnId) => (
            <div key={columnId} id={columnId} className="h-full">
              <KanbanColumn
                title={columnId}
                tasks={tasksData.filter((t: any) => t.status === columnId)}
              />
            </div>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
