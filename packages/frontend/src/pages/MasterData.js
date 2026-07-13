"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterData = MasterData;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var HsCodesTab_1 = require("../modules/master-data/HsCodesTab");
var IncotermsTab_1 = require("../modules/master-data/IncotermsTab");
var VesselsTab_1 = require("../modules/master-data/VesselsTab");
var SchedulesTab_1 = require("../modules/master-data/SchedulesTab");
var DictionaryTab_1 = require("../modules/master-data/DictionaryTab");
function MasterData() {
    var _a = (0, react_1.useState)("schedules"), activeTab = _a[0], setActiveTab = _a[1];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "p-8 max-w-7xl mx-auto space-y-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex justify-between items-center mb-8", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-3xl font-bold text-gray-900 tracking-tight", children: "Master Data" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-gray-500", children: "Gestiona los cat\u00E1logos y datos maestros del ERP log\u00EDstico" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "border-b border-gray-200", children: (0, jsx_runtime_1.jsx)("nav", { className: "flex -mb-px px-6 space-x-8", "aria-label": "Tabs", children: [
                                { id: "schedules", name: "Schedules", icon: lucide_react_1.Calendar },
                                { id: "vessels", name: "Vessels", icon: lucide_react_1.Anchor },
                                { id: "hscodes", name: "HS Codes", icon: lucide_react_1.FileCode2 },
                                { id: "incoterms", name: "Incoterms", icon: lucide_react_1.Database },
                                { id: "dictionary", name: "Dictionary", icon: lucide_react_1.BookOpen },
                            ].map(function (tab) {
                                var Icon = tab.icon;
                                return ((0, jsx_runtime_1.jsxs)("button", { onClick: function () { return setActiveTab(tab.id); }, className: "\n                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm\n                    ".concat(activeTab === tab.id
                                        ? "border-blue-500 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300", "\n                  "), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "\n                      -ml-0.5 mr-2 h-5 w-5\n                      ".concat(activeTab === tab.id ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500", "\n                    ") }), tab.name] }, tab.id));
                            }) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-6", children: [activeTab === "schedules" && (0, jsx_runtime_1.jsx)(SchedulesTab_1.SchedulesTab, {}), activeTab === "vessels" && (0, jsx_runtime_1.jsx)(VesselsTab_1.VesselsTab, {}), activeTab === "incoterms" && (0, jsx_runtime_1.jsx)(IncotermsTab_1.IncotermsTab, {}), activeTab === "hscodes" && (0, jsx_runtime_1.jsx)(HsCodesTab_1.HsCodesTab, {}), activeTab === "dictionary" && (0, jsx_runtime_1.jsx)(DictionaryTab_1.DictionaryTab, {})] })] })] }));
}
