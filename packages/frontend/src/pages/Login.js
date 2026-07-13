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
exports.default = Login;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("firebase/auth");
var components_1 = require("@/components");
var AuthProvider_1 = require("../components/auth/AuthProvider");
var lucide_react_1 = require("lucide-react");
function hashPassword(password) {
    return __awaiter(this, void 0, void 0, function () {
        var msgBuffer, hashBuffer, hashArray;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    msgBuffer = new TextEncoder().encode(password);
                    return [4 /*yield*/, window.crypto.subtle.digest("SHA-256", msgBuffer)];
                case 1:
                    hashBuffer = _a.sent();
                    hashArray = Array.from(new Uint8Array(hashBuffer));
                    return [2 /*return*/, hashArray.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("")];
            }
        });
    });
}
function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    var result = 0;
    for (var i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}
function Login() {
    var _this = this;
    var _a = (0, components_1.useFirebase)(), auth = _a.auth, googleProvider = _a.googleProvider;
    var _b = (0, AuthProvider_1.useAuth)(), user = _b.user, authLoading = _b.loading, mockLoginAsAdmin = _b.mockLoginAsAdmin;
    var _c = (0, react_1.useState)(""), email = _c[0], setEmail = _c[1];
    var _d = (0, react_1.useState)(""), password = _d[0], setPassword = _d[1];
    var _e = (0, react_1.useState)(""), error = _e[0], setError = _e[1];
    var _f = (0, react_1.useState)(false), loading = _f[0], setLoading = _f[1];
    var _g = (0, react_1.useState)(false), requirePasswordChange = _g[0], setRequirePasswordChange = _g[1];
    var _h = (0, react_1.useState)(""), newPassword = _h[0], setNewPassword = _h[1];
    if (authLoading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen flex items-center justify-center bg-slate-950 text-slate-400", children: "Authenticating..." }));
    }
    if (user) {
        return (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/", replace: true });
    }
    var handleEmailLogin = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var normalizedEmail, enteredHash, savedMockHash, _a, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    setLoading(true);
                    setError("");
                    normalizedEmail = email.trim().toLowerCase();
                    if (!(normalizedEmail === "x.pallares1987@gmail.com")) return [3 /*break*/, 4];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, hashPassword(password)];
                case 2:
                    enteredHash = _b.sent();
                    savedMockHash = localStorage.getItem("mock_admin_password_hash") || "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
                    if (timingSafeEqual(enteredHash, savedMockHash)) {
                        if (timingSafeEqual(password, "admin")) {
                            setRequirePasswordChange(true);
                            setLoading(false);
                            return [2 /*return*/];
                        }
                        else {
                            // Already updated password correctly entered, skip password change UI
                            mockLoginAsAdmin(email, "Xavi Pallares");
                            return [2 /*return*/];
                        }
                    }
                    else {
                        setError("Invalid credentials");
                        setLoading(false);
                        return [2 /*return*/];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    setError("Error securing credentials");
                    setLoading(false);
                    return [2 /*return*/];
                case 4:
                    if (!auth) {
                        setLoading(false);
                        return [2 /*return*/];
                    }
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, 8, 9]);
                    return [4 /*yield*/, (0, auth_1.signInWithEmailAndPassword)(auth, email, password)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 9];
                case 7:
                    err_1 = _b.sent();
                    setError(err_1.message || "Invalid credentials");
                    return [3 /*break*/, 9];
                case 8:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var handlePasswordChange = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var newHash, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    e.preventDefault();
                    if (newPassword.length < 8) {
                        setError("Password must be at least 8 characters");
                        return [2 /*return*/];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, hashPassword(newPassword)];
                case 2:
                    newHash = _b.sent();
                    // Save the hash to local storage to persist the override securely
                    localStorage.setItem("mock_admin_password_hash", newHash);
                    // Simulate updating password and log the user in as Admin
                    mockLoginAsAdmin(email, "Xavi Pallares");
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    setError("Failed to secure password.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleGoogleLogin = function () { return __awaiter(_this, void 0, void 0, function () {
        var err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!auth || !googleProvider)
                        return [2 /*return*/];
                    setLoading(true);
                    setError("");
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, (0, auth_1.signInWithPopup)(auth, googleProvider)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 3:
                    err_2 = _a.sent();
                    setError(err_2.message || "SSO Failed");
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl w-full max-w-md p-8 relative z-10", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center mb-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-blue-600 p-3 rounded-xl mb-4 shadow-lg shadow-blue-500/30", children: requirePasswordChange ? ((0, jsx_runtime_1.jsx)(lucide_react_1.KeyRound, { className: "text-white w-8 h-8" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Anchor, { className: "text-white w-8 h-8" })) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-black text-white text-center", children: "Atlas Logistics" }), (0, jsx_runtime_1.jsx)("p", { className: "text-slate-400 text-sm mt-2 text-center", children: requirePasswordChange
                                    ? "Security Policy Update"
                                    : "Enterprise Control Tower Portal" })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm mb-6 text-center", children: error })), !requirePasswordChange ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("form", { onSubmit: handleEmailLogin, className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-slate-400 text-xs font-bold uppercase mb-2", children: "Corporate Email" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" }), (0, jsx_runtime_1.jsx)("input", { type: "email", required: true, className: "w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors", placeholder: "operator@atlas.com", value: email, onChange: function (e) { return setEmail(e.target.value); } })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-slate-400 text-xs font-bold uppercase mb-2", children: "Access Token / Password" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" }), (0, jsx_runtime_1.jsx)("input", { type: "password", required: true, className: "w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: function (e) { return setPassword(e.target.value); } })] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed", children: [loading ? "Authenticating..." : "Secure Login", !loading && (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "w-4 h-4" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-6 flex items-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex-1 border-t border-slate-800" }), (0, jsx_runtime_1.jsx)("span", { className: "px-4 text-xs text-slate-500 uppercase font-bold", children: "Or" }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 border-t border-slate-800" })] }), (0, jsx_runtime_1.jsx)("div", { className: "mt-6", children: (0, jsx_runtime_1.jsxs)("button", { onClick: handleGoogleLogin, disabled: loading, className: "w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-3", children: [(0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 24 24", className: "w-5 h-5", children: [(0, jsx_runtime_1.jsx)("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" }), (0, jsx_runtime_1.jsx)("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] }), "Continue with Workspace SSO"] }) })] })) : ((0, jsx_runtime_1.jsxs)("form", { onSubmit: handlePasswordChange, className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 rounded-lg text-sm mb-4", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Mandatory Action Required" }), (0, jsx_runtime_1.jsx)("br", {}), "Please change your initial password before continuing."] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-slate-400 text-xs font-bold uppercase mb-2", children: "New Password" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" }), (0, jsx_runtime_1.jsx)("input", { type: "password", required: true, className: "w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors", placeholder: "At least 8 characters", value: newPassword, onChange: function (e) { return setNewPassword(e.target.value); } })] })] }), (0, jsx_runtime_1.jsxs)("button", { type: "submit", className: "w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20", children: ["Update Password & Continue", (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronRight, { className: "w-4 h-4" })] })] }))] })] }));
}
