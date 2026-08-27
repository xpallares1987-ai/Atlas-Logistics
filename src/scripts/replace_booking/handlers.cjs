// src/scripts/replace_booking/handlers.cjs
const fs = require("fs");

function injectHandlers(content) {
  const dndHandlers = `
    const handleDragStart = (e, bkgId) => {
      e.dataTransfer.setData("bkgId", bkgId);
    };

    const handleDrop = async (e, newStatus) => {
      e.preventDefault();
      const bkgId = e.dataTransfer.getData("bkgId");
      if (!bkgId) return;

      const bkg = shipments.find(s => s.id === bkgId);
      if (!bkg || bkg.status === newStatus) return;

      try {
        const res = await fetch(API_URL + '/' + bkgId, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          queryClient.invalidateQueries({ queryKey: ["shipments"] });
          if (selectedBkg?.id === bkgId) {
            setFormData(prev => ({ ...prev, status: newStatus }));
            setSelectedBkg(prev => (prev ? { ...prev, status: newStatus } : null));
          }
        }
      } catch (err) {
        console.error("Failed to update status on drop", err);
      }
    };

    const handleDragOver = e => { e.preventDefault(); };
  `;
  const lines = content.split("\n");
  const returnIdx = lines.findIndex((l) => l.includes("return ("));
  if (returnIdx !== -1) {
    lines.splice(returnIdx, 0, dndHandlers);
  }
  return lines.join("\n");
}

module.exports = { injectHandlers };
