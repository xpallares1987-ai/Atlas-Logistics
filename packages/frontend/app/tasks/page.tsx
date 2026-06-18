'use client';

import React, { useState } from 'react';
import { CheckSquare, Square, Search, Plus, Trash2, Calendar } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  ref: string;
  dueDate: string;
  completed: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const initialTasks: Task[] = [
  { id: '1', title: 'Solicitar VGM al shipper', ref: 'BKG-2023-001', dueDate: 'Hoy', completed: false, priority: 'HIGH' },
  { id: '2', title: 'Enviar Draft HBL para aprobación', ref: 'BKG-2023-001', dueDate: 'Mañana', completed: true, priority: 'MEDIUM' },
  { id: '3', title: 'Confirmar ETA con naviera', ref: 'BKG-2023-003', dueDate: 'En 3 días', completed: false, priority: 'MEDIUM' },
  { id: '4', title: 'Revisar despacho aduanero de importación', ref: 'BKG-2023-004', dueDate: 'Hoy', completed: false, priority: 'HIGH' },
  { id: '5', title: 'Emitir factura comercial', ref: 'BKG-2023-005', dueDate: 'Hoy', completed: false, priority: 'LOW' },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState('');
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'URGENT' | 'COMPLETED'>('ALL');

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTask,
      ref: 'GENERAL',
      dueDate: 'Sin fecha',
      completed: false,
      priority: 'MEDIUM',
    };
    setTasks([task, ...tasks]);
    setNewTask('');
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.ref.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'URGENT') return !t.completed && t.priority === 'HIGH';
    if (filterMode === 'COMPLETED') return t.completed;
    return true; // ALL
  });

  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (priority === 'MEDIUM') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Gestor de Tareas</h1>
        <p className="text-gray-400">Checklist operativo para seguimiento de embarques y documentación.</p>
      </div>

      <div className="flex space-x-2 mb-6">
        <button onClick={() => setFilterMode('ALL')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterMode === 'ALL' ? 'bg-blue-600 text-white' : 'bg-[#111114] text-gray-400 border border-gray-800 hover:text-white'}`}>Todas</button>
        <button onClick={() => setFilterMode('URGENT')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterMode === 'URGENT' ? 'bg-red-600 text-white' : 'bg-[#111114] text-gray-400 border border-gray-800 hover:text-white'}`}>Urgentes (Pendientes)</button>
        <button onClick={() => setFilterMode('COMPLETED')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterMode === 'COMPLETED' ? 'bg-emerald-600 text-white' : 'bg-[#111114] text-gray-400 border border-gray-800 hover:text-white'}`}>Completadas</button>
      </div>

      <div className="bg-[#111114] border border-gray-800 rounded-xl overflow-hidden mb-6">
         <div className="p-4 border-b border-gray-800 bg-[#16161A] flex gap-4">
            <form onSubmit={addTask} className="flex-1 flex gap-2">
               <input 
                 type="text" 
                 placeholder="Ej. Enviar pre-alerta MBL al agente..." 
                 value={newTask}
                 onChange={e => setNewTask(e.target.value)}
                 className="flex-1 bg-[#0A0A0B] border border-gray-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
               />
               <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center">
                 <Plus className="w-4 h-4" />
               </button>
            </form>
            <div className="relative w-64">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
               <input 
                 type="text" 
                 placeholder="Buscar tarea..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-[#0A0A0B] border border-gray-800 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-gray-600"
               />
            </div>
         </div>
         
         <div className="divide-y divide-gray-800/50">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No se encontraron tareas en esta vista.
              </div>
            ) : (
              filteredTasks.map(task => (
                <div key={task.id} className={`p-4 flex items-center gap-4 transition-colors hover:bg-[#16161A]/50 ${task.completed ? 'opacity-50' : ''} ${!task.completed && task.priority === 'HIGH' ? 'border-l-2 border-l-red-500' : ''}`}>
                   <button onClick={() => toggleTask(task.id)} className="text-gray-400 hover:text-blue-500 flex-shrink-0">
                     {task.completed ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                   </button>
                   
                   <div className="flex-1 min-w-0">
                     <p className={`text-sm font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                       {task.title}
                     </p>
                     <div className="flex items-center gap-3 mt-1">
                        <a href="/tracking" className="text-xs font-mono text-blue-400 hover:text-blue-300 underline underline-offset-2">{task.ref}</a>
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                     </div>
                   </div>

                   <div className="flex items-center gap-4 flex-shrink-0">
                      <div className={`flex items-center text-xs font-medium ${task.dueDate === 'Hoy' && !task.completed ? 'text-red-400' : 'text-gray-500'}`}>
                        <Calendar className="w-3 h-3 mr-1" /> {task.dueDate}
                      </div>
                      <button onClick={() => removeTask(task.id)} className="text-gray-600 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}
