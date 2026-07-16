import { useState, useEffect } from "react";
import { CheckCircle2, FileText, Clock, AlertCircle } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type TaskState = "TODO" | "IN_PROGRESS" | "DONE";

export interface HumanTask {
  id: string;
  processInstanceKey: string;
  name: string;
  assignee?: string;
  creationDate: string;
  variables: Record<string, any>;
  state: TaskState;
}

// Sortable Item Component (Card)
function SortableTaskCard({ task, onClick }: { task: HumanTask, onClick?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-slate-900/60 border ${isDragging ? 'border-indigo-500 shadow-xl' : 'border-slate-700/50 hover:border-blue-500/50'} rounded-xl p-4 cursor-grab active:cursor-grabbing transition-colors mb-3`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
          <FileText size={14} className="text-purple-400" />
          {task.name}
        </h3>
      </div>
      <div className="mt-3 text-xs text-slate-400 flex justify-between items-center">
        <span className="flex items-center gap-1">
          <Clock size={12} /> {new Date(task.creationDate).toLocaleTimeString()}
        </span>
        <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{task.processInstanceKey.substring(0, 8)}</span>
      </div>
    </div>
  );
}

export function HumanTasklist() {
  const [tasks, setTasks] = useState<HumanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTasks([
        {
          id: "tsk-80123",
          processInstanceKey: "pi-98213",
          name: "Aprobar Despacho Aduanero",
          creationDate: new Date().toISOString(),
          variables: { shipmentRef: "SHP-4402", customsValue: "$124,000" },
          state: "TODO",
        },
        {
          id: "tsk-80124",
          processInstanceKey: "pi-98214",
          name: "Revisión de BAF Anómalo",
          creationDate: new Date(Date.now() - 3600000).toISOString(),
          variables: { shipmentRef: "SHP-4491", marginImpact: "-12%" },
          state: "IN_PROGRESS",
        },
        {
          id: "tsk-80125",
          processInstanceKey: "pi-98215",
          name: "Liberar BL Marítimo",
          creationDate: new Date(Date.now() - 7200000).toISOString(),
          variables: { shipmentRef: "SHP-4490" },
          state: "DONE",
        },
      ]);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id;

    // Is it dropping on a column?
    if (["TODO", "IN_PROGRESS", "DONE"].includes(overId as string)) {
      if (activeTask && activeTask.state !== overId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, state: overId as TaskState } : t));
      }
      return;
    }

    // Dropping on another item
    const overTask = tasks.find(t => t.id === over.id);
    if (activeTask && overTask && activeTask.state !== overTask.state) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, state: overTask.state } : t));
    } else if (activeTask && overTask && activeTask.id !== overTask.id) {
        setTasks((prev) => {
            const oldIndex = prev.findIndex(t => t.id === active.id);
            const newIndex = prev.findIndex(t => t.id === over.id);
            return arrayMove(prev, oldIndex, newIndex);
        });
    }
  };

  const columns: { id: TaskState; title: string; color: string }[] = [
    { id: "TODO", title: "Pendiente", color: "border-slate-700" },
    { id: "IN_PROGRESS", title: "En Progreso", color: "border-blue-700/50" },
    { id: "DONE", title: "Completado", color: "border-emerald-700/50" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0f18] text-slate-200 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl glassmorphism p-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-blue-400" /> Human Tasklist Kanban
          </h2>
          <p className="text-sm text-slate-400 mt-1">Arrastra y suelta las tareas de operaciones para gestionar su estado.</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full"><AlertCircle className="animate-spin text-slate-600" size={32} /></div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-3 gap-6 h-full">
              {columns.map(col => {
                const columnTasks = tasks.filter(t => t.state === col.id);
                return (
                  <div key={col.id} className={`flex flex-col bg-slate-950/50 border-t-4 ${col.color} rounded-xl p-4 shadow-inner`}>
                    <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider mb-4 flex justify-between items-center">
                      {col.title}
                      <span className="bg-slate-800 px-2 py-0.5 rounded text-xs">{columnTasks.length}</span>
                    </h3>
                    
                    <SortableContext id={col.id} items={columnTasks} strategy={verticalListSortingStrategy}>
                      <div className="flex-1 overflow-y-auto">
                        {columnTasks.map(task => (
                          <SortableTaskCard key={task.id} task={task} />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
            
            <DragOverlay>
              {activeId ? (
                <SortableTaskCard task={tasks.find(t => t.id === activeId)!} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
