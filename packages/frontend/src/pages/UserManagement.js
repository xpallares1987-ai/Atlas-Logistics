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
exports.default = UserManagement;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var components_1 = require("@/components");
var dataconnect_generated_1 = require("@/dataconnect-generated");
var lucide_react_1 = require("lucide-react");
var AuthProvider_1 = require("../components/auth/AuthProvider");
var AVAILABLE_ROLES = [
    "ADMIN",
    "EXECUTIVE",
    "MANAGER",
    "TEAM LEADER",
    "SALES",
    "OPERATOR",
    "GUEST",
];
function UserManagement() {
    var _this = this;
    var dataConnect = (0, components_1.useFirebase)().dataConnect;
    var currentUserRole = (0, AuthProvider_1.useAuth)().role;
    var _a = (0, react_1.useState)([]), users = _a[0], setUsers = _a[1];
    var _b = (0, react_1.useState)(true), loading = _b[0], setLoading = _b[1];
    var _c = (0, react_1.useState)(null), error = _c[0], setError = _c[1];
    (0, react_1.useEffect)(function () {
        if (currentUserRole === "ADMIN") {
            fetchUsers();
        }
    }, [dataConnect, currentUserRole]);
    var fetchUsers = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!dataConnect)
                        return [2 /*return*/];
                    setLoading(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, dataconnect_generated_1.getAllUsers)(dataConnect)];
                case 2:
                    response = _a.sent();
                    setUsers(response.data.users);
                    return [3 /*break*/, 5];
                case 3:
                    err_1 = _a.sent();
                    setError(err_1.message || "Failed to fetch users");
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleRoleChange = function (uid, newRole) { return __awaiter(_this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!dataConnect)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    // Optimistic update
                    setUsers(function (prev) {
                        return prev.map(function (u) { return (u.uid === uid ? __assign(__assign({}, u), { role: newRole }) : u); });
                    });
                    return [4 /*yield*/, (0, dataconnect_generated_1.updateUserRole)(dataConnect, { uid: uid, role: newRole })];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _a.sent();
                    setError(err_2.message || "Failed to update role");
                    fetchUsers(); // Revert on failure
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var getRoleIcon = function (role) {
        switch (role) {
            case "ADMIN":
                return (0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "w-4 h-4 text-red-500" });
            case "OPERATOR":
                return (0, jsx_runtime_1.jsx)(lucide_react_1.ShieldCheck, { className: "w-4 h-4 text-blue-500" });
            case "CLIENT":
                return (0, jsx_runtime_1.jsx)(lucide_react_1.Shield, { className: "w-4 h-4 text-emerald-500" });
            default:
                return (0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "w-4 h-4 text-slate-400" });
        }
    };
    if (currentUserRole !== "ADMIN") {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-5xl mx-auto p-12 text-center flex flex-col items-center justify-center", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "w-16 h-16 text-red-400 mb-4" }), (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-slate-800", children: "Access Denied" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 mt-2", children: "Only administrators can manage users and roles." })] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "max-w-5xl mx-auto space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-slate-800", children: "Team & Permissions" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-500 text-sm mt-1", children: "Manage platform access and role-based privileges." })] }), (0, jsx_runtime_1.jsx)("button", { onClick: fetchUsers, className: "bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors", children: "Refresh List" })] }), error && ((0, jsx_runtime_1.jsxs)("div", { className: "bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ShieldAlert, { className: "w-5 h-5" }), error] })), (0, jsx_runtime_1.jsx)("div", { className: "bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", children: (0, jsx_runtime_1.jsxs)("table", { className: "w-full text-left border-collapse", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { className: "bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b border-slate-200", children: [(0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4", children: "User" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4", children: "Current Role" }), (0, jsx_runtime_1.jsx)("th", { className: "px-6 py-4 text-right", children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-slate-100", children: loading ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 3, className: "px-6 py-8 text-center text-slate-400", children: "Loading users..." }) })) : users.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: 3, className: "px-6 py-8 text-center text-slate-400", children: "No users found." }) })) : (users.map(function (user) { return ((0, jsx_runtime_1.jsxs)("tr", { className: "hover:bg-slate-50/50 transition-colors", children: [(0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase", children: user.email.charAt(0) }), (0, jsx_runtime_1.jsx)("div", { className: "font-medium text-slate-700", children: user.email })] }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [getRoleIcon(user.role), (0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-slate-600", children: user.role })] }) }), (0, jsx_runtime_1.jsx)("td", { className: "px-6 py-4 text-right", children: (0, jsx_runtime_1.jsx)("select", { className: "bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 ml-auto cursor-pointer", value: user.role, onChange: function (e) {
                                                return handleRoleChange(user.uid, e.target.value);
                                            }, children: AVAILABLE_ROLES.map(function (r) { return ((0, jsx_runtime_1.jsx)("option", { value: r, children: r }, r)); }) }) })] }, user.uid)); })) })] }) })] }));
}
