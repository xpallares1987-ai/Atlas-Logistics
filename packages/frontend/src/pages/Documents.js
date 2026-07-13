"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Documents;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var components_1 = require("@/components");
var lucide_react_1 = require("lucide-react");
var SmartOCRDropzone_1 = require("@/modules/documents/SmartOCRDropzone");
var DocumentApprovalInbox_1 = require("@/modules/documents/DocumentApprovalInbox");
var react_2 = require("@/dataconnect-generated/react");
var AuthProvider_1 = require("@/components/auth/AuthProvider");
function Documents() {
    var _this = this;
    var _a, _b;
    var tenantId = (0, AuthProvider_1.useAuth)().tenantId;
    // Tab management
    var _c = (0, react_1.useState)('GENERATOR'), activeTab = _c[0], setActiveTab = _c[1];
    // Shipment Selection for Generator
    var shipmentsData = (0, react_2.useListShipments)({ tenantId: tenantId || 'atlas-default-tenant' }).data;
    var _d = (0, react_1.useState)(''), selectedShipmentId = _d[0], setSelectedShipmentId = _d[1];
    // OCR Inbox State
    var _e = (0, react_2.useListPendingOcrDocuments)(), ocrDocsData = _e.data, refetchOcr = _e.refetch;
    var createDoc = (0, react_2.useCreateDocumentFromOcr)()[0];
    var approveDoc = (0, react_2.useApproveOcrDocument)()[0];
    var rejectDoc = (0, react_2.useRejectOcrDocument)()[0];
    var ocrDocuments = (ocrDocsData === null || ocrDocsData === void 0 ? void 0 : ocrDocsData.documents) || [];
    var handleDataExtracted = function (data) { return __awaiter(_this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, createDoc({
                            documentNumber: data.documentNumber || null,
                            documentType: "UNKNOWN",
                            fileName: "Scanned_Document_".concat(Math.floor(Math.random() * 1000), ".pdf"),
                            fileUrl: "https://example.com/fake-url.pdf",
                            mimeType: "application/pdf",
                            extractedData: data
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, refetchOcr()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    console.error("Error saving document:", e_1);
                    alert("Error al guardar el documento.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleApproveOcr = function (id, correctedData) { return __awaiter(_this, void 0, void 0, function () {
        var e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, approveDoc({
                            id: id,
                            extractedData: correctedData,
                            // Opcional: Podríamos vincularlo a un Shipment aquí si documentNumber coincide
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, refetchOcr()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    console.error("Error approving document:", e_2);
                    alert("Error al aprobar.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleRejectOcr = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var e_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, rejectDoc({ id: id })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, refetchOcr()];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_3 = _a.sent();
                    console.error("Error rejecting document:", e_3);
                    alert("Error al rechazar.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    // Find selected shipment to generate BL
    var selectedShipment = shipmentsData === null || shipmentsData === void 0 ? void 0 : shipmentsData.shipments.find(function (s) { return s.trackingNumber === selectedShipmentId; });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-slate-100", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-6 bg-white border-b border-slate-200 shrink-0", children: [(0, jsx_runtime_1.jsxs)("h1", { className: "text-2xl font-bold text-slate-800 flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.FileText, { className: "text-indigo-600" }), "Document Management"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 mt-1", children: "Generaci\u00F3n autom\u00E1tica de BLs y digitalizaci\u00F3n OCR de documentos externos." }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-4 mt-6", children: [(0, jsx_runtime_1.jsx)("button", { onClick: function () { return setActiveTab('GENERATOR'); }, className: "pb-2 font-medium transition-colors border-b-2 ".concat(activeTab === 'GENERATOR' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'), children: "Generador de PDFs" }), (0, jsx_runtime_1.jsxs)("button", { onClick: function () { return setActiveTab('OCR'); }, className: "pb-2 font-medium transition-colors border-b-2 flex items-center gap-2 ".concat(activeTab === 'OCR' ? 'text-indigo-600 border-indigo-600' : 'text-slate-500 border-transparent hover:text-slate-700'), children: ["Bandeja OCR (IA) ", (0, jsx_runtime_1.jsx)(lucide_react_1.Wand2, { size: 16 }), ocrDocuments.length > 0 && ((0, jsx_runtime_1.jsx)("span", { className: "bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full", children: ocrDocuments.length }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 p-6 overflow-hidden flex flex-col h-full", children: [activeTab === 'GENERATOR' && ((0, jsx_runtime_1.jsxs)("div", { className: "h-full flex flex-col gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white p-4 rounded-lg border border-slate-200 flex items-center gap-4 shrink-0 shadow-sm", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "text-slate-400" }), (0, jsx_runtime_1.jsxs)("select", { value: selectedShipmentId, onChange: function (e) { return setSelectedShipmentId(e.target.value); }, className: "flex-1 bg-slate-50 border border-slate-300 rounded-md p-2 outline-none focus:border-indigo-500", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "-- Selecciona un Embarque para generar BL --" }), shipmentsData === null || shipmentsData === void 0 ? void 0 : shipmentsData.shipments.map(function (s) {
                                                var _a;
                                                return ((0, jsx_runtime_1.jsxs)("option", { value: s.trackingNumber, children: [s.trackingNumber, " - ", s.origin, " a ", s.destination, " (", (_a = s.customer) === null || _a === void 0 ? void 0 : _a.name, ")"] }, s.trackingNumber));
                                            })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-auto", children: selectedShipment ? ((0, jsx_runtime_1.jsx)(components_1.DocumentPreviewer, { type: "HBL", reference: selectedShipment.trackingNumber || '', shipper: ((_a = selectedShipment.supplier) === null || _a === void 0 ? void 0 : _a.name) || "No especificado", consignee: ((_b = selectedShipment.customer) === null || _b === void 0 ? void 0 : _b.name) || "No especificado", vessel: selectedShipment.vesselName || "TBD", pol: selectedShipment.origin || "", pod: selectedShipment.destination || "", marksAndNumbers: "N/M", descriptionOfGoods: selectedShipment.movementType + " CARGO", grossWeight: "0 KGS", measurement: "0 CBM", issueDate: new Date().toISOString().split('T')[0], onDownload: function () { return alert("Generando PDF (html2pdf)..."); } })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center h-full text-slate-400", children: (0, jsx_runtime_1.jsx)("p", { children: "Selecciona un embarque para visualizar el Bill of Lading." }) })) })] })), activeTab === 'OCR' && ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 xl:grid-cols-3 gap-6 h-full overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "xl:col-span-1", children: (0, jsx_runtime_1.jsx)(SmartOCRDropzone_1.SmartOCRDropzone, { onDataExtracted: handleDataExtracted }) }), (0, jsx_runtime_1.jsx)("div", { className: "xl:col-span-2 h-full", children: (0, jsx_runtime_1.jsx)(DocumentApprovalInbox_1.DocumentApprovalInbox, { documents: ocrDocuments, onApprove: handleApproveOcr, onReject: handleRejectOcr }) })] }))] })] }));
}
