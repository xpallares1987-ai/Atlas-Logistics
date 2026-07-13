"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Procurement;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var CarriersTab_1 = require("../modules/procurement/CarriersTab");
var HauliersTab_1 = require("../modules/procurement/HauliersTab");
var AgentsTab_1 = require("../modules/procurement/AgentsTab");
function Procurement() {
    var _a = (0, react_1.useState)("carriers"), activeTab = _a[0], setActiveTab = _a[1];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "p-8 max-w-7xl mx-auto space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between mb-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Briefcase, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "Procurement (Compras)" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500", children: "Gesti\u00F3n de Navieras, Transportistas y Agentes Corresponsales" })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-gray-200 shrink-0", children: (0, jsx_runtime_1.jsx)("nav", { className: "flex space-x-8 px-6", "aria-label": "Tabs", children: [
                                { id: "carriers", name: "Navieras (Carriers)", icon: lucide_react_1.Ship },
                                { id: "hauliers", name: "Transportistas (Hauliers)", icon: lucide_react_1.Truck },
                                { id: "agents", name: "Agentes en Destino", icon: lucide_react_1.Globe },
                            ].map(function (tab) {
                                var Icon = tab.icon;
                                return ((0, jsx_runtime_1.jsxs)("button", { onClick: function () { return setActiveTab(tab.id); }, className: "\n                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm\n                    ".concat(activeTab === tab.id
                                        ? "border-emerald-500 text-emerald-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300", "\n                  "), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "\n                      -ml-0.5 mr-2 h-5 w-5\n                      ".concat(activeTab === tab.id ? "text-emerald-500" : "text-gray-400 group-hover:text-gray-500", "\n                    ") }), tab.name] }, tab.id));
                            }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-auto bg-gray-50 p-6", children: [activeTab === "carriers" && (0, jsx_runtime_1.jsx)(CarriersTab_1.CarriersTab, {}), activeTab === "hauliers" && (0, jsx_runtime_1.jsx)(HauliersTab_1.HauliersTab, {}), activeTab === "agents" && (0, jsx_runtime_1.jsx)(AgentsTab_1.AgentsTab, {})] })] })] }));
}
