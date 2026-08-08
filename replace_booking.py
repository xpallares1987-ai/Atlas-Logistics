import re
from src.scripts.replace_booking.header import inject_header

file_path = "packages/frontend/src/pages/BookingManagementModule.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State
content = re.sub(
    r'const \[activeTab, setActiveTab\] = useState<"All" \| "DRAFT" \| "CONFIRMED">\(\s*"All",\s*\);',
    'const [activeTab, setActiveTab] = useState<"All" | "DRAFT" | "CONFIRMED">("All");\n  const [viewMode, setViewMode] = useState<"list" | "board">("board");',
    content
)

# 2. Handlers
handlers = """
  const handleDragStart = (e: React.DragEvent, bkgId: string) => {
    e.dataTransfer.setData("bkgId", bkgId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const bkgId = e.dataTransfer.getData("bkgId");
    if (!bkgId) return;

    const bkg = shipments.find(s => s.id === bkgId);
    if (!bkg || bkg.status === newStatus) return;

    try {
      const res = await fetch(`${API_URL}/${bkgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["shipments"] });
        if (selectedBkg?.id === bkgId) {
          setFormData((prev) => ({ ...prev, status: newStatus }));
          setSelectedBkg((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error("Failed to update status on drop", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return ("""
content = content.replace('  return (', handlers)

# 3. Header
header_old = """        <button
          onClick={handleNewBooking}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          + New Booking
        </button>"""
header_new = """        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 shadow-inner">
            <button 
              onClick={() => setViewMode("list")} 
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === "list" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
            >
              List View
            </button>
            <button 
              onClick={() => setViewMode("board")} 
              className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === "board" ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"}`}
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
        </div>"""
content = inject_header(content)

# 4. Layout Replacement
layout_match = re.search(r'(<div className="flex-1 overflow-hidden flex">.*?)(<div className="max-w-4xl mx-auto">)', content, re.DOTALL)
if not layout_match:
    print("Failed to match top half of layout")
    exit(1)

new_layout_top = """<div className="flex-1 overflow-hidden relative flex bg-slate-50/50">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {viewMode === "list" ? (
             <div className="flex flex-col h-full bg-slate-50/50">
               <div className="p-4 border-b border-slate-200 flex gap-2 bg-white sticky top-0 z-10 shadow-sm">
                 {["All", "DRAFT", "CONFIRMED"].map((tab) => (
                   <button
                     key={tab}
                     onClick={() => setActiveTab(tab as any)}
                     className={`px-5 py-2 text-sm font-bold rounded-full transition-all ${activeTab === tab ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200" : "text-slate-500 hover:bg-slate-100"}`}
                   >
                     {tab}
                   </button>
                 ))}
               </div>
               <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                 {loading ? (
                   <p className="text-sm text-slate-500 text-center py-4 col-span-full">Loading bookings...</p>
                 ) : (
                   shipments
                     .filter((b) => activeTab === "All" || b.status === activeTab)
                     .map((bkg) => (
                       <div
                         key={bkg.id}
                         onClick={() => handleSelectBooking(bkg)}
                         className={`p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${selectedBkg?.id === bkg.id ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-md" : "border-slate-200 bg-white shadow-sm"}`}
                       >
                         <div className="flex justify-between items-start mb-4">
                           <span className="font-mono font-bold text-slate-800 text-base">{bkg.referenceNumber}</span>
                           <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border tracking-wider ${getStatusColor(bkg.status)}`}>{bkg.status}</span>
                         </div>
                         <h3 className="font-bold text-slate-700 truncate text-sm mb-4">{bkg.customer}</h3>
                         <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                           <div className="flex flex-col gap-1 w-2/5">
                             <span className="uppercase text-[10px] font-bold text-slate-400">Origin</span>
                             <span className="font-medium text-slate-700 truncate">{bkg.origin?.split(" ")[0] || "?"}</span>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                           <div className="flex flex-col gap-1 w-2/5 items-end text-right">
                             <span className="uppercase text-[10px] font-bold text-slate-400">Destination</span>
                             <span className="font-medium text-slate-700 truncate">{bkg.destination?.split(" ")[0] || "?"}</span>
                           </div>
                         </div>
                       </div>
                     ))
                 )}
               </div>
             </div>
          ) : (
             <div className="flex-1 flex overflow-x-auto p-6 gap-6 bg-slate-100/30">
                {["DRAFT", "CONFIRMED", "DOCUMENTATION", "ON_BOARD"].map(col => (
                  <div 
                    key={col} 
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col)}
                    className="w-[340px] shrink-0 bg-slate-200/50 rounded-2xl p-4 flex flex-col shadow-inner border border-slate-200/60"
                  >
                    <div className="flex justify-between items-center mb-5 px-2">
                      <h3 className="font-black text-slate-700 text-sm tracking-wide uppercase">{col.replace('_', ' ')}</h3>
                      <span className="bg-slate-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                         {shipments.filter(s => s.status === col).length}
                      </span>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto min-h-[150px] pb-4 px-1 custom-scrollbar">
                       {shipments.filter(s => s.status === col).map(bkg => (
                           <div 
                              key={bkg.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, bkg.id)}
                              onClick={() => handleSelectBooking(bkg)}
                              className={`bg-white p-5 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-lg ${selectedBkg?.id === bkg.id ? 'border-indigo-400 shadow-md ring-2 ring-indigo-500/10' : 'border-slate-100 shadow-sm hover:border-indigo-200'}`}
                           >
                               <div className="flex justify-between items-start mb-3">
                                 <div className="font-mono font-bold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded">{bkg.referenceNumber}</div>
                                 <Ship className="w-4 h-4 text-slate-400" />
                               </div>
                               <div className="font-semibold text-slate-700 mb-4 truncate text-sm">{bkg.customer || "Unknown Customer"}</div>
                               <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                                 <div className="flex items-center gap-1.5 w-2/5 overflow-hidden">
                                   <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> 
                                   <span className="truncate font-medium">{bkg.origin?.split(',')[0] || "?"}</span>
                                 </div>
                                 <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                 <div className="flex items-center gap-1.5 w-2/5 justify-end overflow-hidden">
                                   <span className="truncate font-medium">{bkg.destination?.split(',')[0] || "?"}</span>
                                   <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                 </div>
                               </div>
                           </div>
                       ))}
                    </div>
                  </div>
                ))}
             </div>
          )}
        </div>

        {/* Slide-Over Editor Panel */}
        { (selectedBkg || isEditing) && (
          <>
            <div 
               className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-20 transition-opacity" 
               onClick={() => { setSelectedBkg(null); setIsEditing(false); }} 
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-[800px] bg-slate-50 border-l border-slate-200 shadow-[rgba(0,0,0,0.1)_0px_0px_30px] z-30 flex flex-col transform transition-transform duration-300 ease-in-out">
              <div className="flex-1 overflow-y-auto p-8 relative">
                 <button 
                   onClick={() => { setSelectedBkg(null); setIsEditing(false); }} 
                   className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors z-10"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 </button>
                 <div className="max-w-4xl mx-auto">"""

content = content.replace(layout_match.group(0), new_layout_top)

# 5. Bottom Replacement
bottom_match = re.search(r'(<p className="text-sm text-slate-400 italic">.*?)(?:  \) : \(\s*<div className="absolute inset-0.*?)(</div >\s*</div>\s*</div>\s*\);\s*})', content, re.DOTALL)

if not bottom_match:
    # let's try a different regex for the bottom part
    bottom_match = re.search(r'(<p className="text-sm text-slate-400 italic">\s*No cargo defined.*?</div>\s*</div>\s*</div>\s*</div>\s*\)\s*:\s*\(\s*<div className="absolute inset-0.*?)(</div>\s*</div>\s*</div>\s*\);\s*})', content, re.DOTALL)
    
if not bottom_match:
    print("Could not match the bottom layout!")
    
    # Debugging
    idx = content.find('<p className="text-sm text-slate-400 italic">')
    print("Found text-sm at", idx)
    print(content[idx:idx+1000])
    exit(1)

new_layout_bottom = """</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}"""

# Actually we just want to replace the false branch of `selectedBkg || isEditing` which we removed.
# The original code has:
#                    )}
#                  </div>
#                </div>
#              </div>
#            </div>
#          ) : (
#            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
#              <FileText className="w-16 h-16 mb-4 text-slate-200" />
#              <p>
#                Select a booking to view or edit details, or create a new one.
#              </p>
#            </div>
#          )}
#        </div>
#      </div>
#    </div>
#  );
#}

to_replace_regex = r'(</div>\s*</div>\s*</div>\s*</div>\s*)\)\s*:\s*\(\s*<div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">\s*<FileText className="w-16 h-16 mb-4 text-slate-200" />\s*<p>\s*Select a booking to view or edit details, or create a new one.\s*</p>\s*</div>\s*\)\}\s*</div>\s*</div>\s*</div>\s*\);\s*\}'
content = re.sub(to_replace_regex, r'\1' + new_layout_bottom, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully replaced layout via python script")
