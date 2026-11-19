/**
 * @file task-form-viewer.ts
 * @description Preview renderer for BPMN UserTask form definitions using safe DOM construction.
 * @module @atlas/bpmn-modeler/ui/task-form-viewer
 */

interface FormEnumValue {
  id: string;
  name: string;
}

interface FormFieldDefinition {
  id: string;
  label?: string;
  type?: string;
  defaultValue?: string;
  values?: FormEnumValue[];
}

interface ExtensionElement {
  $type: string;
  fields?: FormFieldDefinition[];
  formKey?: string;
}

interface SelectedBpmnTask {
  type: string;
  businessObject: {
    name?: string;
    extensionElements?: {
      values?: ExtensionElement[];
    };
  };
}

interface ModelerEventBus {
  on: (
    event: string,
    listener: (e: { newSelection?: SelectedBpmnTask[] }) => void,
  ) => void;
}

let container: HTMLElement | null = null;

export function initTaskFormViewer() {
  container = document.createElement("div");
  container.className = "task-form-viewer";

  container.style.display = "none";
  container.style.position = "absolute";
  container.style.right = "0";
  container.style.bottom = "0";
  container.style.width = "300px";
  container.style.height = "400px";
  container.style.backgroundColor = "var(--surface)";
  container.style.borderLeft = "1px solid var(--border)";
  container.style.borderTop = "1px solid var(--border)";
  container.style.zIndex = "90";
  container.style.padding = "1rem";
  container.style.overflowY = "auto";

  document.body.appendChild(container);
}

export function bindTaskFormViewerEvents(modeler: ModelerEventBus) {
  modeler.on("selection.changed", (e) => {
    const newSelection = e.newSelection;
    if (newSelection && newSelection.length === 1) {
      const element = newSelection[0];
      if (element.type === "bpmn:UserTask") {
        renderFormForTask(element);
      } else {
        hideForm();
      }
    } else {
      hideForm();
    }
  });
}

function hideForm() {
  if (container) {
    container.style.display = "none";
  }
}

function renderFormForTask(element: SelectedBpmnTask) {
  if (!container) return;

  const businessObject = element.businessObject;
  const extensionElements = businessObject.extensionElements;

  if (!extensionElements) {
    hideForm();
    return;
  }

  let formFields: FormFieldDefinition[] = [];
  const values = extensionElements.values || [];

  const formData = values.find((v) => v.$type === "camunda:FormData");
  if (formData && formData.fields) {
    formFields = formData.fields;
  } else {
    const zeebeForm = values.find((v) => v.$type === "zeebe:FormDefinition");
    if (zeebeForm) {
      container.style.display = "block";

      const heading = document.createElement("h4");
      heading.textContent = "Task Form (Zeebe)";

      const keyParagraph = document.createElement("p");
      keyParagraph.textContent = `Form Key: ${zeebeForm.formKey ?? ""}`;

      const noteParagraph = document.createElement("p");
      const noteEm = document.createElement("em");
      noteEm.textContent =
        "Zeebe forms require loading a separate form definition.";
      noteParagraph.appendChild(noteEm);

      container.replaceChildren(heading, keyParagraph, noteParagraph);
      return;
    }

    hideForm();
    return;
  }

  if (formFields.length === 0) {
    hideForm();
    return;
  }

  container.style.display = "block";

  const heading = document.createElement("h4");
  heading.textContent = businessObject.name || "Task Form";

  const form = document.createElement("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  formFields.forEach((field) => {
    const fieldGroup = document.createElement("div");
    fieldGroup.style.marginBottom = "10px";

    const label = document.createElement("label");
    label.style.display = "block";
    label.style.fontSize = "0.9rem";
    label.style.marginBottom = "5px";
    label.htmlFor = field.id;
    label.textContent = field.label || field.id;
    fieldGroup.appendChild(label);

    if (field.type === "enum" && field.values) {
      const select = document.createElement("select");
      select.style.width = "100%";
      select.style.padding = "5px";
      select.id = field.id;

      field.values.forEach((val) => {
        const option = document.createElement("option");
        option.value = val.id;
        option.textContent = val.name;
        select.appendChild(option);
      });

      fieldGroup.appendChild(select);
    } else if (field.type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = field.id;
      fieldGroup.appendChild(checkbox);
    } else {
      const input = document.createElement("input");
      input.type = "text";
      input.style.width = "100%";
      input.style.padding = "5px";
      input.id = field.id;
      input.placeholder = field.defaultValue || "";
      fieldGroup.appendChild(input);
    }

    form.appendChild(fieldGroup);
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "btn btn-primary btn-sm";
  submitBtn.style.marginTop = "10px";
  submitBtn.style.width = "100%";
  submitBtn.textContent = "Submit (Preview)";
  form.appendChild(submitBtn);

  container.replaceChildren(heading, form);
}
