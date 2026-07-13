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
exports.default = Shipments;
var jsx_runtime_1 = require("react/jsx-runtime");
var dexie_react_hooks_1 = require("dexie-react-hooks");
var dexie_1 = require("../db/dexie");
function Shipments() {
    var _this = this;
    var embarques = (0, dexie_react_hooks_1.useLiveQuery)(function () { return dexie_1.db.embarques.toArray(); });
    if (embarques === undefined) {
        return (0, jsx_runtime_1.jsx)("div", { className: "text-gray-500", children: "Cargando embarques..." });
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-semibold text-slate-800", children: "Gesti\u00F3n de Embarques" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: function () { return __awaiter(_this, void 0, void 0, function () {
                                    var getApp, _a, getFunctions, httpsCallable, app, functions, startErpSimulation, result, e_1;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0:
                                                _b.trys.push([0, 4, , 5]);
                                                return [4 /*yield*/, Promise.resolve().then(function () { return require("firebase/app"); })];
                                            case 1:
                                                getApp = (_b.sent()).getApp;
                                                return [4 /*yield*/, Promise.resolve().then(function () { return require("firebase/functions"); })];
                                            case 2:
                                                _a = _b.sent(), getFunctions = _a.getFunctions, httpsCallable = _a.httpsCallable;
                                                app = getApp();
                                                functions = getFunctions(app, "europe-west1");
                                                startErpSimulation = httpsCallable(functions, "startErpSimulation");
                                                alert("Iniciando simulación del ERP...");
                                                return [4 /*yield*/, startErpSimulation({
                                                        trackingNumber: "SIMULATION-TEST",
                                                        expectedStatus: "AT_PORT",
                                                        delaySeconds: 15
                                                    })];
                                            case 3:
                                                result = _b.sent();
                                                console.log("ERP Simulation Result:", result.data);
                                                alert("Simulación encolada con éxito. Revisa los logs en 15 segundos.");
                                                return [3 /*break*/, 5];
                                            case 4:
                                                e_1 = _b.sent();
                                                console.error(e_1);
                                                alert("Error al iniciar simulación");
                                                return [3 /*break*/, 5];
                                            case 5: return [2 /*return*/];
                                        }
                                    });
                                }); }, className: "bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors", children: "Simular ERP" }), (0, jsx_runtime_1.jsx)("button", { className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors", children: "Nuevo Embarque" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200", children: (0, jsx_runtime_1.jsxs)("table", { className: "min-w-full divide-y divide-gray-200", children: [(0, jsx_runtime_1.jsx)("thead", { className: "bg-gray-50", children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Seguimiento (AWB/BL)" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Ruta" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ETS" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "ETA" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "bg-white divide-y divide-gray-200", children: embarques.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 5, className: "px-6 py-4 text-center text-sm text-gray-500", children: "No hay embarques registrados o sincronizados." }) })) : (embarques.map(function (embarque) { return ((0, jsx_runtime_1.jsxs)("tr", { className: "hover:bg-gray-50", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600", children: embarque.numero_seguimiento }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4 whitespace-nowrap text-sm", children: (0, jsx_runtime_1.jsx)("span", { className: "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800", children: embarque.estado }) }), (0, jsx_runtime_1.jsxs)("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: [embarque.puerto_origen, " \u2192 ", embarque.puerto_destino] }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: embarque.ets
                                            ? new Date(embarque.ets).toLocaleDateString()
                                            : "-" }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: embarque.eta
                                            ? new Date(embarque.eta).toLocaleDateString()
                                            : "-" })] }, embarque.numero_seguimiento)); })) })] }) })] }));
}
