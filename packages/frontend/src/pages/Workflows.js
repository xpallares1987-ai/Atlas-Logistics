"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WorkflowsPage;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var bpmn_template_1 = require("./bpmn-template");
function WorkflowsPage() {
    var containerRef = (0, react_1.useRef)(null);
    var initialized = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(function () {
        if (initialized.current)
            return;
        initialized.current = true;
        // Use a small timeout to let React completely paint the dangerouslySetInnerHTML content
        var timer = setTimeout(function () {
            // Check if the DOM is actually present to prevent Strict Mode errors
            if (document.querySelector("#canvas")) {
                // Module removed during monolith migration
            }
        }, 150);
        return function () {
            clearTimeout(timer);
        };
    }, []);
    return ((0, jsx_runtime_1.jsx)("div", { className: "w-full h-[calc(100vh-120px)] relative bpmn-modeler-wrapper bg-white shadow-sm rounded-xl overflow-hidden", ref: containerRef, dangerouslySetInnerHTML: { __html: bpmn_template_1.bpmnHtml } }));
}
