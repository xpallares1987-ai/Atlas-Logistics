"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Consolidation;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var components_1 = require("@/components");
var LclConsolidationEngine = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('@/components/LclConsolidationEngine'); }).then(function (m) { return ({ default: m.LclConsolidationEngine }); }); });
var ContainerPlanner = react_1.default.lazy(function () { return Promise.resolve().then(function () { return require('@/components/ContainerPlanner'); }).then(function (m) { return ({ default: m.ContainerPlanner }); }); });
var lucide_react_1 = require("lucide-react");
function Consolidation() {
    var cargoPool = (0, react_1.useState)(components_1.INITIAL_POOL)[0];
    var _a = (0, react_1.useState)([
        { id: 'mc-1', specId: '40ft', route: 'Shanghai -> Rotterdam', assignedCargoIds: [] }
    ]), masterContainers = _a[0], setMasterContainers = _a[1];
    var _b = (0, react_1.useState)('mc-1'), activeContainerId = _b[0], setActiveContainerId = _b[1];
    var _c = (0, react_1.useState)(new Set()), selectedPoolIds = _c[0], setSelectedPoolIds = _c[1];
    var toggleSelection = function (id) {
        setSelectedPoolIds(function (prev) {
            var next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    var assignSelected = function () {
        if (!activeContainerId || selectedPoolIds.size === 0)
            return;
        setMasterContainers(function (prev) { return prev.map(function (c) {
            if (c.id === activeContainerId) {
                return __assign(__assign({}, c), { assignedCargoIds: __spreadArray(__spreadArray([], c.assignedCargoIds, true), Array.from(selectedPoolIds), true) });
            }
            return c;
        }); });
        setSelectedPoolIds(new Set());
    };
    var removeAssigned = function (cargoId) {
        setMasterContainers(function (prev) { return prev.map(function (c) { return (__assign(__assign({}, c), { assignedCargoIds: c.assignedCargoIds.filter(function (id) { return id !== cargoId; }) })); }); });
    };
    var createNewContainer = function () {
        var newId = "mc-".concat(masterContainers.length + 1);
        setMasterContainers(function (prev) { return __spreadArray(__spreadArray([], prev, true), [{
                id: newId, specId: '20ft', route: 'New Route', assignedCargoIds: []
            }], false); });
        setActiveContainerId(newId);
    };
    var activeContainer = masterContainers.find(function (c) { return c.id === activeContainerId; });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-slate-950 text-white overflow-hidden", children: [(0, jsx_runtime_1.jsxs)("div", { className: "p-6 bg-slate-900 border-b border-slate-800 shrink-0", children: [(0, jsx_runtime_1.jsxs)("h1", { className: "text-2xl font-bold text-white flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Package, { className: "text-emerald-400" }), "Advanced NVOCC Consolidation"] }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-400 mt-1", children: "Plan LCL cargo loading and optimize 3D container space." })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto", children: (0, jsx_runtime_1.jsxs)("div", { className: "p-6 space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4 border-b border-slate-800 bg-slate-800/50", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-emerald-400", children: "Step 1: Cargo Allocation" }) }), (0, jsx_runtime_1.jsx)(react_1.Suspense, { fallback: (0, jsx_runtime_1.jsx)("div", { className: "p-8 text-center text-slate-400", children: "Loading Consolidation Engine..." }), children: (0, jsx_runtime_1.jsx)(LclConsolidationEngine, { cargoPool: cargoPool, masterContainers: masterContainers, activeContainerId: activeContainerId, selectedPoolIds: selectedPoolIds, toggleSelection: toggleSelection, assignSelected: assignSelected, removeAssigned: removeAssigned, createNewContainer: createNewContainer, setActiveContainerId: setActiveContainerId }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4 border-b border-slate-800 bg-slate-800/50", children: (0, jsx_runtime_1.jsxs)("h2", { className: "text-lg font-semibold text-blue-400", children: ["Step 2: 3D Container Planning (Active: ", activeContainer === null || activeContainer === void 0 ? void 0 : activeContainer.id, ")"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "h-[600px]", children: (0, jsx_runtime_1.jsx)(react_1.Suspense, { fallback: (0, jsx_runtime_1.jsx)("div", { className: "p-8 text-center text-slate-400", children: "Loading 3D Container Planner..." }), children: (0, jsx_runtime_1.jsx)(ContainerPlanner, { items: activeContainer ? activeContainer.assignedCargoIds.map(function (id) { return cargoPool.find(function (c) { return c.id === id; }); }) : [] }) }) })] })] }) })] }));
}
