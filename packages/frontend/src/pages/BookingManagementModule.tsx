// @ts-nocheck
import { useState } from "react";
import { Button, Input, Select } from "@atlas/ui";
import { useApiQuery, useQueryClient } from "../hooks/useApiQuery";
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Ship,
  Anchor,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer as _Printer,
  ChevronRight,
  Save,
  Trash2,
  Book,
  Download,
} from "lucide-react";

interface Container {
  containerNumber: string;
  isoType: string;
  sealNumber: string;
}

interface Commodity {
  description: string;
  pieces: number;
  grossWeightKg: number;
  volumeCbm: number;
}

interface Booking {
  id: string;
  referenceNumber: string;
  customer: string;
  consignee?: string;
  origin: string;
  destination: string;
  equipment: string;
  status: string;
  vessel: string;
  voyage: string;
  containers?: Container[];
  commodities?: Commodity[];
}

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/operations/bookings`
  : "/api/operations/bookings";

const DOCS_API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/documents`
  : "/api/documents";

export default function BookingManagementModule() {
  const queryClient = useQueryClient();
  const { data: shipments = [], isLoading: loading } = useApiQuery<Booking[]>(
    ["bookings"],
    "/operations/bookings",
  );

  const [activeTab, setActiveTab] = useState<"All" | "DRAFT" | "CONFIRMED">(
    "All",
  );
  const [viewMode, setViewMode] = useState<"list" | "board">("board");
  const [selectedBkg, setSelectedBkg] = useState<Booking | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Booking>>({});

  const handleNewBooking = () => {
    setSelectedBkg(null);
    setFormData({
      referenceNumber: `BKG-${Math.floor(10000 + Math.random() * 90000)}`,
      status: "DRAFT",
      customer: "",
      consignee: "",
      origin: "",
      destination: "",
      equipment: "1x 20DC",
      vessel: "",
      voyage: "",
      containers: [],
      commodities: [],
    });
    setIsEditing(true);
  };

  const handleSelectBooking = (bkg: Booking) => {
    setSelectedBkg(bkg);
    setFormData({
      ...bkg,
      containers: bkg.containers || [],
      commodities: bkg.commodities || [],
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      const method = formData.id ? "PUT" : "POST";
      const url = formData.id ? `${API_URL}/${formData.id}` : API_URL;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        const savedBkg = await res.json();
        handleSelectBooking(savedBkg);
      }
    } catch (err) {
      console.error("Failed to save booking", err);
    }
  };

  const handleApprove = async () => {
    if (!selectedBkg?.id) return;
    try {
      const updatedData = { ...formData, status: "CONFIRMED" };
      const res = await fetch(`${API_URL}/${selectedBkg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        const savedBkg = await res.json();
        handleSelectBooking(savedBkg);
      }
    } catch (err) {
      console.error("Failed to approve booking", err);
    }
  };

  const handleDelete = async () => {
    if (!selectedBkg?.id) return;
    if (!window.confirm("Are you sure you want to delete this booking?"))
      return;

    try {
      const res = await fetch(`${API_URL}/${selectedBkg.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        setSelectedBkg(null);
        setFormData({});
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to delete booking", err);
    }
  };

  const handleGenerateHBL = async () => {
    if (!selectedBkg) return;
    try {
      // Setup payload with defaults if empty
      const payload = {
        shipmentId: selectedBkg.referenceNumber,
        shipper: selectedBkg.customer || "DEFAULT SHIPPER LTD.",
        consignee: selectedBkg.consignee || "DEFAULT CONSIGNEE INC.",
        portOfLoading: selectedBkg.origin || "POL UNKNOWN",
        portOfDischarge: selectedBkg.destination || "POD UNKNOWN",
        vessel: selectedBkg.vessel || "TBN",
        voyage: selectedBkg.voyage || "TBN",
        containers: selectedBkg.containers?.length
          ? selectedBkg.containers
          : [
              {
                containerNumber: "MSKU1234567",
                isoType: selectedBkg.equipment || "40HC",
                sealNumber: "SEAL-001",
              },
            ],
        commodities: selectedBkg.commodities?.length
          ? selectedBkg.commodities
          : [
              {
                description: "Freight All Kinds (FAK)",
                pieces: 100,
                grossWeightKg: 15000,
                volumeCbm: 30,
              },
            ],
      };

      const res = await fetch(`${DOCS_API_URL}/hbl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `HBL-${payload.shipmentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate HBL", err);
      alert("Failed to generate HBL PDF.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DOCUMENTATION":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "ON_BOARD":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const addContainer = () => {
    setFormData((prev) => ({
      ...prev,
      containers: [
        ...(prev.containers || []),
        { containerNumber: "", isoType: "20DC", sealNumber: "" },
      ],
    }));
  };

  const updateContainer = (index: number, field: string, value: string) => {
    const newContainers = [...(formData.containers || [])];
    newContainers[index] = { ...newContainers[index], [field]: value };
    setFormData((prev) => ({ ...prev, containers: newContainers }));
  };

  const addCommodity = () => {
    setFormData((prev) => ({
      ...prev,
      commodities: [
        ...(prev.commodities || []),
        { description: "", pieces: 0, grossWeightKg: 0, volumeCbm: 0 },
      ],
    }));
  };

  const updateCommodity = (
    index: number,
    field: keyof Commodity,
    value: any,
  ) => {
    const newCommodities = [...(formData.commodities || [])];
    newCommodities[index] = { ...newCommodities[index], [field]: value };
    setFormData((prev) => ({ ...prev, commodities: newCommodities }));
  };

  const handleDragStart = (e: React.DragEvent, bkgId: string) => {
    e.dataTransfer.setData("bkgId", bkgId);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const bkgId = e.dataTransfer.getData("bkgId");
    if (!bkgId) return;

    const bkg = shipments.find((s) => s.id === bkgId);
    if (!bkg || bkg.status === newStatus) return;

    try {
      const res = await fetch(`${API_URL}/${bkgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["bookings"] });
        if (selectedBkg?.id === bkgId) {
          setFormData((prev) => ({ ...prev, status: newStatus }));
          setSelectedBkg((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
      }
    } catch (err) {
      console.error("Failed to update status on drop", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Book className="w-6 h-6 text-indigo-600" />
            Booking & B/L Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Convert quotes to bookings and issue House Bills of Lading.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-lg flex gap-1 shadow-inner">
            <Button
              onClick={() => setViewMode("list")}
              variant={viewMode === "list" ? "default" : "ghost"}
              className={
                viewMode === "list"
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }
            >
              List View
            </Button>
            <Button
              onClick={() => setViewMode("board")}
              variant={viewMode === "board" ? "default" : "ghost"}
              className={
                viewMode === "board"
                  ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
              }
            >
              Kanban Board
            </Button>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              className="rounded-xl px-6 py-2.5 font-bold hover:bg-slate-50"
              onClick={() => alert("EDI parser module not implemented yet.")}
            >
              <FileText size={20} className="mr-2" />
              Upload EDI/XML
            </Button>
            <Button
              className="rounded-xl px-6 py-2.5 font-bold shadow-lg shadow-indigo-600/30 hover:scale-105"
              onClick={handleNewBooking}
            >
              <Plus size={20} className="mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex bg-slate-50/50">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {viewMode === "list" ? (
            <div className="flex flex-col h-full bg-slate-50/50">
              <div className="p-4 border-b border-slate-200 flex gap-2 bg-white sticky top-0 z-10 shadow-sm">
                {["All", "DRAFT", "CONFIRMED"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "secondary" : "ghost"}
                    onClick={() => setActiveTab(tab as any)}
                    className={`rounded-full px-5 py-2 text-sm font-bold ${activeTab === tab ? "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-200" : "text-slate-500"}`}
                  >
                    {tab}
                  </Button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
                {loading ? (
                  <p className="text-sm text-slate-500 text-center py-4 col-span-full">
                    Loading bookings...
                  </p>
                ) : (
                  shipments
                    .filter(
                      (b) => activeTab === "All" || b.status === activeTab,
                    )
                    .map((bkg) => (
                      <div
                        key={bkg.id}
                        onClick={() => handleSelectBooking(bkg)}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${selectedBkg?.id === bkg.id ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10 shadow-md" : "border-slate-200 bg-white shadow-sm"}`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-mono font-bold text-slate-800 text-base">
                            {bkg.referenceNumber}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border tracking-wider ${getStatusColor(bkg.status)}`}
                          >
                            {bkg.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-700 truncate text-sm mb-4">
                          {bkg.customer}
                        </h3>
                        <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex flex-col gap-1 w-2/5">
                            <span className="uppercase text-[10px] font-bold text-slate-400">
                              Origin
                            </span>
                            <span className="font-medium text-slate-700 truncate">
                              {bkg.origin?.split(" ")[0] || "?"}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                          <div className="flex flex-col gap-1 w-2/5 items-end text-right">
                            <span className="uppercase text-[10px] font-bold text-slate-400">
                              Destination
                            </span>
                            <span className="font-medium text-slate-700 truncate">
                              {bkg.destination?.split(" ")[0] || "?"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-x-auto p-6 gap-6 bg-slate-100/30">
              {["DRAFT", "CONFIRMED", "DOCUMENTATION", "ON_BOARD"].map(
                (col) => (
                  <div
                    key={col}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, col)}
                    className="w-[340px] shrink-0 bg-slate-200/50 rounded-2xl p-4 flex flex-col shadow-inner border border-slate-200/60"
                  >
                    <div className="flex justify-between items-center mb-5 px-2">
                      <h3 className="font-black text-slate-700 text-sm tracking-wide uppercase">
                        {col.replace("_", " ")}
                      </h3>
                      <span className="bg-slate-700 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {shipments.filter((s) => s.status === col).length}
                      </span>
                    </div>
                    <div className="flex-1 space-y-4 overflow-y-auto min-h-[150px] pb-4 px-1 custom-scrollbar">
                      {shipments
                        .filter((s) => s.status === col)
                        .map((bkg) => (
                          <div
                            key={bkg.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, bkg.id)}
                            onClick={() => handleSelectBooking(bkg)}
                            className={`bg-white p-5 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-lg ${selectedBkg?.id === bkg.id ? "border-indigo-400 shadow-md ring-2 ring-indigo-500/10" : "border-slate-100 shadow-sm hover:border-indigo-200"}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="font-mono font-bold text-slate-800 text-sm bg-slate-100 px-2 py-0.5 rounded">
                                {bkg.referenceNumber}
                              </div>
                              <Ship className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="font-semibold text-slate-700 mb-4 truncate text-sm">
                              {bkg.customer || "Unknown Customer"}
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                              <div className="flex items-center gap-1.5 w-2/5 overflow-hidden">
                                <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span className="truncate font-medium">
                                  {bkg.origin?.split(",")[0] || "?"}
                                </span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                              <div className="flex items-center gap-1.5 w-2/5 justify-end overflow-hidden">
                                <span className="truncate font-medium">
                                  {bkg.destination?.split(",")[0] || "?"}
                                </span>
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        {/* Slide-Over Editor Panel */}
        {(selectedBkg || isEditing) && (
          <>
            <div
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] z-20 transition-opacity"
              onClick={() => {
                setSelectedBkg(null);
                setIsEditing(false);
              }}
            />
            <div className="absolute inset-y-0 right-0 w-full max-w-[800px] bg-slate-50 border-l border-slate-200 shadow-[rgba(0,0,0,0.1)_0px_0px_30px] z-30 flex flex-col transform transition-transform duration-300 ease-in-out">
              <div className="flex-1 overflow-y-auto p-8 relative">
                <Button
                  onClick={() => {
                    setSelectedBkg(null);
                    setIsEditing(false);
                  }}
                  variant="secondary"
                  className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full p-2 z-10"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </Button>
                <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-800">
                        {formData.referenceNumber}
                      </h2>
                      <p className="text-slate-500">
                        {formData.customer || "New Customer"}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      {selectedBkg && !isEditing && (
                        <>
                          <Button
                            onClick={handleGenerateHBL}
                            variant="outline"
                            className="bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-700"
                          >
                            <Download className="w-4 h-4 mr-2" /> Download HBL
                          </Button>
                          <Button
                            onClick={() => setIsEditing(true)}
                            variant="outline"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={handleDelete}
                            variant="destructive"
                            className="bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700 border"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </Button>
                          {formData.status !== "CONFIRMED" && (
                            <Button
                              onClick={handleApprove}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                            </Button>
                          )}
                        </>
                      )}
                      {isEditing && (
                        <>
                          <Button
                            onClick={() =>
                              selectedBkg
                                ? setIsEditing(false)
                                : setFormData({})
                            }
                            variant="outline"
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save Booking
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* B/L Editor Form */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 px-6 py-3 border-b border-slate-700 flex items-center justify-between">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" /> House
                        Bill of Lading Draft
                      </h3>
                      <span className="text-xs text-slate-400 font-mono">
                        HBL-{formData.referenceNumber?.replace("BKG-", "")}
                      </span>
                    </div>

                    <div className="p-6 grid grid-cols-2 gap-6 border-b border-slate-100">
                      <div className="col-span-2 md:col-span-1 space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Shipper
                          </label>
                          <Input
                            type="text"
                            disabled={!isEditing}
                            value={formData.customer || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                customer: e.target.value,
                              })
                            }
                            placeholder="Shipper Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Consignee
                          </label>
                          <Input
                            type="text"
                            disabled={!isEditing}
                            value={formData.consignee || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                consignee: e.target.value,
                              })
                            }
                            placeholder="Consignee Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Status
                          </label>
                          <Select
                            disabled={!isEditing}
                            value={formData.status || "DRAFT"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                status: e.target.value,
                              })
                            }
                          >
                            <option value="DRAFT">DRAFT</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="DOCUMENTATION">DOCUMENTATION</option>
                            <option value="ON_BOARD">ON_BOARD</option>
                          </Select>
                        </div>
                      </div>

                      <div className="col-span-2 md:col-span-1 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Vessel
                            </label>
                            <Input
                              type="text"
                              disabled={!isEditing}
                              value={formData.vessel || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  vessel: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Voyage
                            </label>
                            <Input
                              type="text"
                              disabled={!isEditing}
                              value={formData.voyage || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  voyage: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Port of Loading
                            </label>
                            <Input
                              type="text"
                              disabled={!isEditing}
                              value={formData.origin || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  origin: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              Port of Discharge
                            </label>
                            <Input
                              type="text"
                              disabled={!isEditing}
                              value={formData.destination || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  destination: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Equipment
                          </label>
                          <Input
                            type="text"
                            disabled={!isEditing}
                            value={formData.equipment || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                equipment: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional details for Containers & Commodities */}
                    <div className="p-6 bg-slate-50">
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">
                            Containers
                          </label>
                          {isEditing && (
                            <Button
                              onClick={addContainer}
                              variant="link"
                              className="text-xs text-indigo-600 hover:text-indigo-800 p-0 h-auto"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Container
                            </Button>
                          )}
                        </div>
                        {formData.containers &&
                        formData.containers.length > 0 ? (
                          <div className="space-y-2">
                            {formData.containers.map((ctr, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2 items-center"
                              >
                                <Input
                                  disabled={!isEditing}
                                  type="text"
                                  placeholder="Container #"
                                  value={ctr.containerNumber}
                                  onChange={(e) =>
                                    updateContainer(
                                      idx,
                                      "containerNumber",
                                      e.target.value,
                                    )
                                  }
                                  className="w-1/3"
                                />
                                <Input
                                  disabled={!isEditing}
                                  type="text"
                                  placeholder="Type"
                                  value={ctr.isoType}
                                  onChange={(e) =>
                                    updateContainer(
                                      idx,
                                      "isoType",
                                      e.target.value,
                                    )
                                  }
                                  className="w-1/4"
                                />
                                <Input
                                  disabled={!isEditing}
                                  type="text"
                                  placeholder="Seal #"
                                  value={ctr.sealNumber}
                                  onChange={(e) =>
                                    updateContainer(
                                      idx,
                                      "sealNumber",
                                      e.target.value,
                                    )
                                  }
                                  className="w-1/3"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            No containers defined. Default will be used on HBL
                            generation.
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">
                            Commodities (Cargo)
                          </label>
                          {isEditing && (
                            <Button
                              onClick={addCommodity}
                              variant="link"
                              className="text-xs text-indigo-600 hover:text-indigo-800 p-0 h-auto"
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Cargo
                            </Button>
                          )}
                        </div>
                        {formData.commodities &&
                        formData.commodities.length > 0 ? (
                          <div className="space-y-2">
                            {formData.commodities.map((cmd, idx) => (
                              <div
                                key={idx}
                                className="flex gap-2 items-center"
                              >
                                <Input
                                  disabled={!isEditing}
                                  type="text"
                                  placeholder="Description"
                                  value={cmd.description}
                                  onChange={(e) =>
                                    updateCommodity(
                                      idx,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <Input
                                  disabled={!isEditing}
                                  type="number"
                                  placeholder="Pieces"
                                  value={cmd.pieces}
                                  onChange={(e) =>
                                    updateCommodity(
                                      idx,
                                      "pieces",
                                      parseInt(e.target.value),
                                    )
                                  }
                                  className="w-16"
                                />
                                <Input
                                  disabled={!isEditing}
                                  type="number"
                                  placeholder="Weight (KG)"
                                  value={cmd.grossWeightKg}
                                  onChange={(e) =>
                                    updateCommodity(
                                      idx,
                                      "grossWeightKg",
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="w-24"
                                />
                                <Input
                                  disabled={!isEditing}
                                  type="number"
                                  placeholder="Volume (CBM)"
                                  value={cmd.volumeCbm}
                                  onChange={(e) =>
                                    updateCommodity(
                                      idx,
                                      "volumeCbm",
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="w-28"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400 italic">
                            No cargo defined. FAK default will be used on HBL
                            generation.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
