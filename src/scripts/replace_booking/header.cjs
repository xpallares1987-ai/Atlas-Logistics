const fs = require('fs');

function injectHeader(content) {
  const headerOld = `<button
            onClick={handleNewBooking}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            + New Booking
          </button>`;
  const headerNew = `<div className="flex items-center gap-4">
            <div className="bg-slate-100 p-1 rounded-lg flex gap-1 shadow-inner">
              <button 
                onClick={() => setViewMode("list")} 
                className={\`px-4 py-1.5 text-sm font-semibold rounded-md transition-all \${viewMode === "list" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}\`}
              >
                List View
              </button>
              <button 
                onClick={() => setViewMode("board")} 
                className={\`px-4 py-1.5 text-sm font-semibold rounded-md transition-all \${viewMode === "board" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}\`}
              >
                Kanban Board
              </button>
            </div>
            <button
              onClick={handleNewBooking}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-5 h-5" /> New Booking
            </button>
          </div>`;
  return content.replace(headerOld, headerNew);
}

module.exports = { injectHeader };
