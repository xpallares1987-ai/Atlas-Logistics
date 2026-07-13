"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CRM;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var CustomersTab_1 = require("../modules/crm/CustomersTab");
var PipelineTab_1 = require("../modules/crm/PipelineTab");
var ActivityTab_1 = require("../modules/crm/ActivityTab");
function CRM() {
    var _a = (0, react_1.useState)("customers"), activeTab = _a[0], setActiveTab = _a[1];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "p-8 max-w-7xl mx-auto space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-between mb-8", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Users, { className: "h-6 w-6" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "CRM (Sales)" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500", children: "Gesti\u00F3n de clientes, oportunidades y actividad comercial" })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-gray-200 shrink-0", children: (0, jsx_runtime_1.jsx)("nav", { className: "flex space-x-8 px-6", "aria-label": "Tabs", children: [
                                { id: "customers", name: "Directorio de Clientes", icon: lucide_react_1.Users },
                                { id: "pipeline", name: "Pipeline (Oportunidades)", icon: lucide_react_1.Trello },
                                { id: "activity", name: "Actividad y Visitas", icon: lucide_react_1.Calendar },
                            ].map(function (tab) {
                                var Icon = tab.icon;
                                return ((0, jsx_runtime_1.jsxs)("button", { onClick: function () { return setActiveTab(tab.id); }, className: "\n                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm\n                    ".concat(activeTab === tab.id
                                        ? "border-indigo-500 text-indigo-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300", "\n                  "), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "\n                      -ml-0.5 mr-2 h-5 w-5\n                      ".concat(activeTab === tab.id ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500", "\n                    ") }), tab.name] }, tab.id));
                            }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1 overflow-auto bg-gray-50 p-6", children: [activeTab === "customers" && (0, jsx_runtime_1.jsx)(CustomersTab_1.CustomersTab, {}), activeTab === "pipeline" && (0, jsx_runtime_1.jsx)(PipelineTab_1.PipelineTab, {}), activeTab === "activity" && (0, jsx_runtime_1.jsx)(ActivityTab_1.ActivityTab, {})] })] })] }));
}
