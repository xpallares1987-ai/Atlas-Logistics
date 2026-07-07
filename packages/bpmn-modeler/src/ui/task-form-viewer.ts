// Imports removed as they are unused

let container: HTMLElement | null = null;

export function initTaskFormViewer() {
  container = document.createElement('div');
  container.className = 'task-form-viewer';

  // Style and position it
  container.style.display = 'none';
  container.style.position = 'absolute';
  container.style.right = '0';
  container.style.bottom = '0';
  container.style.width = '300px';
  container.style.height = '400px';
  container.style.backgroundColor = 'var(--surface)';
  container.style.borderLeft = '1px solid var(--border)';
  container.style.borderTop = '1px solid var(--border)';
  container.style.zIndex = '90';
  container.style.padding = '1rem';
  container.style.overflowY = 'auto';

  document.body.appendChild(container);

  // We need to listen to event bus events when modeler is available
  // Or we can poll for modeler if it's not ready immediately
  // But standard way is listening to "selection.changed" if state.modeler exists
  // For robustness, we can export a bind function that gets called after modeler creation
}

export function bindTaskFormViewerEvents(modeler: any) {
  modeler.on('selection.changed', (e: any) => {
    const newSelection = e.newSelection;
    if (newSelection && newSelection.length === 1) {
      const element = newSelection[0];
      if (element.type === 'bpmn:UserTask') {
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
    container.style.display = 'none';
  }
}

function renderFormForTask(element: any) {
  if (!container) return;

  const businessObject = element.businessObject;
  const extensionElements = businessObject.extensionElements;

  if (!extensionElements) {
    hideForm();
    return;
  }

  // Look for zeebe:FormDefinition or camunda:FormData
  let formFields: any[] = [];
  const values = extensionElements.values || [];

  // Basic parsing for camunda:FormData
  const formData = values.find((v: any) => v.$type === 'camunda:FormData');
  if (formData && formData.fields) {
    formFields = formData.fields;
  } else {
    // Check for Zeebe forms
    const zeebeForm = values.find((v: any) => v.$type === 'zeebe:FormDefinition');
    if (zeebeForm) {
      // In a real app we'd fetch the JSON form definition using zeebeForm.formKey
      container.style.display = 'block';
      container.innerHTML = `
        <h4>Task Form (Zeebe)</h4>
        <p>Form Key: ${zeebeForm.formKey}</p>
        <p><em>Zeebe forms require a form definition to be loaded separately.</em></p>
      `;
      return;
    } else {
      hideForm();
      return;
    }
  }

  if (formFields.length === 0) {
    hideForm();
    return;
  }

  // Render form
  container.style.display = 'block';
  let html = `<h4>${businessObject.name || 'Task Form'}</h4>`;
  html += '<form onsubmit="event.preventDefault()">';

  formFields.forEach((field) => {
    html += `
      <div style="margin-bottom: 10px;">
        <label style="display:block; font-size: 0.9rem; margin-bottom: 5px;">${field.label || field.id}</label>
    `;
    if (field.type === 'enum' && field.values) {
      html += `<select style="width: 100%; padding: 5px;" id="${field.id}">`;
      field.values.forEach((val: any) => {
        html += `<option value="${val.id}">${val.name}</option>`;
      });
      html += '</select>';
    } else if (field.type === 'boolean') {
      html += `<input type="checkbox" id="${field.id}">`;
    } else {
      html += `<input type="text" style="width: 100%; padding: 5px;" id="${field.id}" placeholder="${field.defaultValue || ''}">`;
    }
    html += '</div>';
  });

  html +=
    '<button class="btn btn-primary btn-sm" style="margin-top: 10px; width: 100%">Submit (Preview)</button>';
  html += '</form>';

  container.innerHTML = html;
}
