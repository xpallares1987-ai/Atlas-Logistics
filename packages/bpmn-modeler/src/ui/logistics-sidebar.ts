import { calculateProcessAnalytics, importDiagram } from '../services/modeler-service';
import { safeGetMetadata, validateProperty } from '../schemas/metadata';
import type { AppState } from '../state';
import { Toast } from '@atlas/ui';

export function initLogisticsSidebar(state: AppState) {
  const sidebar = document.getElementById('propertiesSidebar');
  const propertiesContainer = document.getElementById('properties');
  if (!sidebar || !propertiesContainer) return;

  // 1. Create and inject sidebar tabs
  const header = sidebar.querySelector('.sidebar__header');
  if (header) {
    header.innerHTML = '';
    const titleContainer = document.createElement('div');
    titleContainer.className = 'sidebar-tabs';
    titleContainer.innerHTML = `
      <button id="tabCamunda" class="sidebar-tab sidebar-tab--active" type="button">Camunda 8</button>
      <button id="tabLogistics" class="sidebar-tab" type="button">Simulador</button>
      <button id="tabHistory" class="sidebar-tab" type="button">Historial</button>
      <button id="tabXml" class="sidebar-tab" type="button">XML Live</button>
    `;
    header.appendChild(titleContainer);
  }

  // 2. Create containers for custom panels
  const logisticsPanel = document.createElement('div');
  logisticsPanel.id = 'logisticsPanel';
  logisticsPanel.className = 'sidebar-panel hidden';

  const historyPanel = document.createElement('div');
  historyPanel.id = 'historyPanel';
  historyPanel.className = 'sidebar-panel hidden';

  const xmlPanel = document.createElement('div');
  xmlPanel.id = 'xmlPanel';
  xmlPanel.className = 'sidebar-panel hidden';

  propertiesContainer.parentNode?.appendChild(logisticsPanel);
  propertiesContainer.parentNode?.appendChild(historyPanel);
  propertiesContainer.parentNode?.appendChild(xmlPanel);

  // Set original container class
  propertiesContainer.classList.add('sidebar-panel');

  // Tab Switch logic
  const tabCamunda = document.getElementById('tabCamunda');
  const tabLogistics = document.getElementById('tabLogistics');
  const tabHistory = document.getElementById('tabHistory');
  const tabXml = document.getElementById('tabXml');

  function switchTab(activeTab: HTMLElement, panelToShow: HTMLElement) {
    [tabCamunda, tabLogistics, tabHistory, tabXml].forEach((t) =>
      t?.classList.remove('sidebar-tab--active')
    );
    [propertiesContainer, logisticsPanel, historyPanel, xmlPanel].forEach((p) =>
      p?.classList.add('hidden')
    );

    activeTab.classList.add('sidebar-tab--active');
    panelToShow.classList.remove('hidden');
  }

  tabCamunda?.addEventListener('click', () => switchTab(tabCamunda, propertiesContainer));
  tabLogistics?.addEventListener('click', () => {
    switchTab(tabLogistics, logisticsPanel);
    renderLogisticsPanel(state, logisticsPanel);
  });
  tabHistory?.addEventListener('click', () => {
    switchTab(tabHistory, historyPanel);
    renderHistoryPanel(state, historyPanel);
  });
  tabXml?.addEventListener('click', () => {
    switchTab(tabXml, xmlPanel);
    renderXmlPanel(state, xmlPanel);
  });

  // Modeler selection listener
  if (state.modeler) {
    state.modeler.on('selection.changed', () => {
      if (!logisticsPanel.classList.contains('hidden')) {
        renderLogisticsPanel(state, logisticsPanel);
      }
    });

    state.modeler.on('commandStack.changed', () => {
      if (!logisticsPanel.classList.contains('hidden')) {
        renderLogisticsPanel(state, logisticsPanel);
      }
      if (!xmlPanel.classList.contains('hidden')) {
        renderXmlPanel(state, xmlPanel);
      }
    });
  }
}

interface BpmnElement {
  id: string;
  type: string;
  businessObject: {
    $instanceOf: (type: string) => boolean;
    $type: string;
    name?: string;
    get?: (key: string) => string | undefined;
    [key: string]: unknown;
  };
}

function renderLogisticsPanel(state: AppState, container: HTMLElement) {
  const modeler = state.modeler;
  const analytics = calculateProcessAnalytics(modeler);

  // Get selected element
  let selectedElement: BpmnElement | null = null;
  if (modeler) {
    const selection = modeler.get('selection') as { get: () => BpmnElement[] };
    selectedElement = selection?.get()?.[0] || null;
  }

  const isTask =
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.('bpmn:Task') ||
      selectedElement.businessObject?.$type?.includes?.('Task'));

  const isSequenceFlow =
    selectedElement &&
    (selectedElement.businessObject?.$instanceOf?.('bpmn:SequenceFlow') ||
      selectedElement.businessObject?.$type?.includes?.('SequenceFlow'));

  let elementMetadataHtml = '';

  if (isTask && selectedElement) {
    const bo = selectedElement.businessObject;
    const metadata = safeGetMetadata(bo);

    elementMetadataHtml = `
      <div class="panel-section">
        <h3 class="panel-section__title">Metadatos Logísticos</h3>
        <div class="form-group">
          <label>Elemento Seleccionado</label>
          <div class="selected-badge">${bo.name || selectedElement.id} (${selectedElement.type.replace('bpmn:', '')})</div>
        </div>
        <div class="form-group">
          <label for="sysCost">Costo Operativo por Hora ($)</label>
          <input type="number" id="sysCost" class="input" placeholder="Ej. 150" value="${metadata.costHR || ''}" />
        </div>
        <div class="form-group">
          <label for="sysStatus">Estado Operativo</label>
          <select id="sysStatus" class="input">
            <option value="" ${!metadata.status ? 'selected' : ''}>Sin asignar</option>
            <option value="Listo" ${metadata.status === 'Listo' ? 'selected' : ''}>Listo</option>
            <option value="delayed" ${metadata.status === 'delayed' || metadata.status === 'Retrasado' ? 'selected' : ''}>Retrasado</option>
            <option value="blocked" ${metadata.status === 'blocked' || metadata.status === 'Bloqueado' ? 'selected' : ''}>Bloqueado</option>
            </select>
            </div>
            <div class="form-group">
            <label for="sysForm">Clave de Formulario (UI)</label>
            <input type="text" id="sysForm" class="input" placeholder="form-id-123" value="${metadata.formKey || ''}" />
            </div>
            <div class="form-group">
            <label for="sysDecision">ID de Decisión (DMN)</label>
            <input type="text" id="sysDecision" class="input" placeholder="decision-table-id" value="${metadata.decisionRef || ''}" />
            </div>

      </div>

      <div class="panel-section">
        <h3 class="panel-section__title">Conectores Camunda 8</h3>
        <p class="section-desc">Arrastra o aplica plantillas rápidas de conectores Zeebe:</p>
        <div class="connectors-grid">
          <div class="connector-card" data-type="slack" title="Notificar por Slack">
            <div class="connector-card__icon">💬</div>
            <div class="connector-card__name">Slack Alerta</div>
          </div>
          <div class="connector-card" data-type="rest" title="Consulta API REST">
            <div class="connector-card__icon">🌐</div>
            <div class="connector-card__name">REST Container</div>
          </div>
          <div class="connector-card" data-type="email" title="Enviar Email SendGrid">
            <div class="connector-card__icon">✉️</div>
            <div class="connector-card__name">SendGrid Email</div>
          </div>
        </div>
      </div>
    `;
  } else if (isSequenceFlow && selectedElement) {
    const bo = selectedElement.businessObject;
    let existingCondition = '';
    if (bo.conditionExpression && (bo.conditionExpression as any).body) {
      existingCondition = (bo.conditionExpression as any).body.replace(/"/g, '&quot;');
    }

    elementMetadataHtml = `
      <div class="panel-section">
        <h3 class="panel-section__title">Enrutamiento Inteligente (Zeebe)</h3>
        <p class="section-desc">Configura reglas de decisión basadas en los datos del Shipment.</p>
        <div class="form-group">
          <label>Elemento Seleccionado</label>
          <div class="selected-badge">${bo.name || selectedElement.id} (SequenceFlow)</div>
        </div>
        
        <div class="form-group">
          <label for="condIncoterm">Incoterm</label>
          <select id="condIncoterm" class="input">
             <option value="">Cualquiera</option>
             <option value="EXW">EXW (Ex Works)</option>
             <option value="FOB">FOB (Free On Board)</option>
             <option value="CIF">CIF</option>
             <option value="DAP">DAP</option>
             <option value="DDP">DDP</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="condMovement">Tipo de Carga</label>
          <select id="condMovement" class="input">
             <option value="">Cualquiera</option>
             <option value="FCL">FCL (Contenedor Completo)</option>
             <option value="LCL">LCL (Grupaje)</option>
             <option value="AIR">AIR (Aéreo)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Expresión FEEL Resultante</label>
          <input type="text" id="zeebeCondition" class="input" readonly placeholder="=" value="${existingCondition}" />
        </div>
        <button id="btnApplyCondition" class="btn btn--primary btn--full-width" type="button" style="margin-top: 8px;">
          Aplicar Regla al Flujo
        </button>
      </div>
    `;
  } else {
    elementMetadataHtml = `
      <div class="no-selection-alert">
        <div class="no-selection-alert__icon">ℹ️</div>
        <div>Selecciona una <b>Tarea (Task)</b> o una <b>Flecha (SequenceFlow)</b> en el lienzo para configurar sus opciones.</div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="sidebar-scrollable">
      <!-- 1. General Dashboard -->
      <div class="panel-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 class="panel-section__title" style="margin-bottom: 0;">Simulador & KPI</h3>
          <button id="btnGenerateSOP" class="btn btn--transparent" style="padding: 4px 8px; font-size: 10px; font-weight: 700;">GELAR SOP (MD)</button>
        </div>
        <div class="kpi-dashboard">
          <div class="kpi-card kpi-card--primary">
            <div class="kpi-card__val">$${analytics.totalCost.toLocaleString()}</div>
            <div class="kpi-card__label">Costo Proyectado</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__val">${analytics.totalTasks}</div>
            <div class="kpi-card__label">Tareas</div>
          </div>
        </div>

        <div class="kpi-dashboard">
          <div class="kpi-card ${analytics.delayedTasksCount > 0 ? 'kpi-card--warning' : ''}">
            <div class="kpi-card__val">${analytics.delayedTasksCount}</div>
            <div class="kpi-card__label">Retrasadas</div>
          </div>
          <div class="kpi-card ${analytics.blockedTasksCount > 0 ? 'kpi-card--danger' : ''}">
            <div class="kpi-card__val">${analytics.blockedTasksCount}</div>
            <div class="kpi-card__label">Bloqueadas</div>
          </div>
        </div>
      </div>

      <!-- 2. Selected Element Metadata -->
      ${elementMetadataHtml}

      <!-- 3. Bottleneck details if any -->
      ${
        analytics.bottlenecks.length > 0
          ? `
        <div class="panel-section">
          <h3 class="panel-section__title panel-section__title--danger">Cuellos de Botella Detectados</h3>
          <div class="bottlenecks-list">
            ${analytics.bottlenecks
              .map(
                (b) => `
              <div class="bottleneck-item bottleneck-item--${b.status === 'Bloqueado' ? 'blocked' : 'delayed'}" data-element-id="${b.id}">
                <div class="bottleneck-item__header">
                  <span class="bottleneck-item__status-badge">${b.status}</span>
                  <span class="bottleneck-item__id">${b.id}</span>
                </div>
                <div class="bottleneck-item__name">${b.name}</div>
                <div class="bottleneck-item__cost">Costo: $${b.cost}/hr</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
          : ''
      }
    </div>
  `;

  // 4. Bind events for inputs
  if (isTask && modeler) {
    const sysCost = document.getElementById('sysCost') as HTMLInputElement;
    const sysStatus = document.getElementById('sysStatus') as HTMLSelectElement;
    const sysForm = document.getElementById('sysForm') as HTMLInputElement;
    const sysDecision = document.getElementById('sysDecision') as HTMLInputElement;

    const updateProp = (key: string, value: string) => {
      try {
        const modeling = modeler.get('modeling') as {
          updateProperties: (el: BpmnElement, props: Record<string, unknown>) => void;
        };
        if (selectedElement) {
          // Validate before update
          try {
            const validatedValue = validateProperty(key, value);
            modeling.updateProperties(selectedElement, { [key]: validatedValue });
          } catch (err: any) {
            Toast.show(err.message || 'Valor no válido', 'error');
          }
        }
      } catch {
        console.error('Failed to update element property:');
      }
    };

    sysCost?.addEventListener('input', () => updateProp('sys:costHR', sysCost.value));
    sysStatus?.addEventListener('change', () => updateProp('sys:status', sysStatus.value));
    sysForm?.addEventListener('input', () => updateProp('sys:formKey', sysForm.value));
    sysDecision?.addEventListener('input', () => updateProp('sys:decisionRef', sysDecision.value));

    // Bind Connectors clicks
    container.querySelectorAll('.connector-card').forEach((card) => {
      card.addEventListener('click', () => {
        const type = card.getAttribute('data-type')!;
        let name = '';
        let zeebeType = '';

        if (type === 'slack') {
          name = 'Slack Alerta';
          zeebeType = 'slack-connector';
        } else if (type === 'rest') {
          name = 'REST Container Status';
          zeebeType = 'http-rest-query';
        } else if (type === 'email') {
          name = 'SendGrid Email Notificación';
          zeebeType = 'sendgrid-email';
        }

        try {
          const modeling = modeler.get('modeling') as {
            updateProperties: (el: BpmnElement, props: Record<string, unknown>) => void;
          };
          if (selectedElement) {
            modeling.updateProperties(selectedElement, {
              name,
              'zeebe:taskDefinition': {
                type: zeebeType,
                retries: '3',
              },
            });
            Toast.show(`Conector ${name} aplicado`, 'success');
            renderLogisticsPanel(state, container);
          }
        } catch {
          Toast.show('Error al aplicar conector de Camunda 8', 'error');
        }
      });
    });
  } else if (isSequenceFlow && modeler) {
    const condIncoterm = document.getElementById('condIncoterm') as HTMLSelectElement;
    const condMovement = document.getElementById('condMovement') as HTMLSelectElement;
    const zeebeCondition = document.getElementById('zeebeCondition') as HTMLInputElement;
    const btnApplyCondition = document.getElementById('btnApplyCondition');

    const updateConditionPreview = () => {
      let conditions = [];
      if (condIncoterm.value) conditions.push(`incoterm = "${condIncoterm.value}"`);
      if (condMovement.value) conditions.push(`movementType = "${condMovement.value}"`);

      if (conditions.length > 0) {
        zeebeCondition.value = '=' + conditions.join(' and ');
      } else {
        zeebeCondition.value = '';
      }
    };

    condIncoterm?.addEventListener('change', updateConditionPreview);
    condMovement?.addEventListener('change', updateConditionPreview);

    btnApplyCondition?.addEventListener('click', () => {
      if (!selectedElement) return;
      try {
        const modeling = modeler.get('modeling') as any;
        const moddle = modeler.get('moddle') as any;

        let conditionObj = undefined;
        if (zeebeCondition.value) {
          conditionObj = moddle.create('bpmn:FormalExpression', {
            body: zeebeCondition.value,
          });
        }

        modeling.updateProperties(selectedElement, {
          conditionExpression: conditionObj,
        });

        Toast.show('Regla de enrutamiento FEEL aplicada', 'success');
      } catch (err) {
        console.error(err);
        Toast.show('Error al aplicar la regla', 'error');
      }
    });
  }

  // Bind SOP generation
  const btnSOP = document.getElementById('btnGenerateSOP');
  if (btnSOP && state.modeler) {
    btnSOP.addEventListener('click', async () => {
      const { generateSOP } = await import('../services/sop-service');
      const sop = await generateSOP(state.modeler!);
      const blob = new Blob([sop], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SOP_${Date.now()}.md`;
      a.click();
      Toast.show('SOP generado con éxito (Markdown)', 'success');
    });
  }

  // Bind Bottlenecks navigation click
  container.querySelectorAll('.bottleneck-item').forEach((item) => {
    item.addEventListener('click', () => {
      const elementId = item.getAttribute('data-element-id')!;
      const elementRegistry = modeler?.get('elementRegistry') as
        { get: (id: string) => BpmnElement } | undefined;
      const element = elementRegistry?.get(elementId);
      if (modeler && element) {
        const selection = modeler.get('selection') as { select: (el: BpmnElement) => void };
        const canvas = modeler.get('canvas') as { zoom: (level: number, el: BpmnElement) => void };
        selection.select(element);
        canvas.zoom(1.2, element);
        Toast.show(`Visualizando tarea: ${element.businessObject.name || elementId}`, 'info');
      }
    });
  });
}

async function renderHistoryPanel(state: AppState, container: HTMLElement) {
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
  if (!activeTab) {
    container.innerHTML = `<div class="no-selection-alert">No hay una pestaña activa para rastrear historial.</div>`;
    return;
  }

  const { historyService } = await import('../services/history-service');
  const versions = await historyService.getVersions(activeTab.id);

  container.innerHTML = `
    <div class="sidebar-scrollable">
      <div class="panel-section">
        <h3 class="panel-section__title">Historial de Versiones</h3>
        <p class="section-desc">Crea puntos de restauración (commits) locales para esta pestaña.</p>
        
        <div class="form-group">
          <input type="text" id="historyCommitMsg" class="input" placeholder="Mensaje de versión..." />
        </div>
        <button id="btnSaveHistoryVersion" class="btn btn--primary btn--full-width" type="button" style="margin-top: 8px;">
          Guardar Punto de Control
        </button>
      </div>

      <div class="panel-section">
        <h3 class="panel-section__title">Línea de Tiempo</h3>
        ${
          versions.length === 0
            ? `
          <div class="no-versions-msg">Sin versiones guardadas todavía. Crea un punto de control arriba.</div>
        `
            : `
          <div class="history-timeline">
            ${versions
              .map((v) => {
                const dateStr = new Date(v.timestamp).toLocaleString();
                return `
                <div class="history-timeline__item">
                  <div class="history-timeline__point"></div>
                  <div class="history-timeline__content">
                    <div class="history-timeline__header">
                      <span class="history-timeline__date">${dateStr}</span>
                    </div>
                    <div class="history-timeline__label">${v.label}</div>
                    <div class="history-timeline__actions" style="margin-top:8px;">
                      <button class="btn btn-restore btn--transparent" data-version-id="${v.id}" type="button" style="padding: 2px 6px; font-size:11px;">Restaurar</button>
                      <button class="btn btn-delete btn--transparent" data-version-id="${v.id}" type="button" style="padding: 2px 6px; font-size:11px; color: var(--danger);">Eliminar</button>
                    </div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        `
        }
      </div>
    </div>
  `;

  // Bind actions
  const btnSave = document.getElementById('btnSaveHistoryVersion');
  const inputCommit = document.getElementById('historyCommitMsg') as HTMLInputElement;

  btnSave?.addEventListener('click', async () => {
    const label =
      inputCommit?.value.trim() || `Punto de Control - ${new Date().toLocaleTimeString()}`;
    if (!state.modeler) return;

    try {
      const xml = await state.modeler.saveXML({ format: true });
      if (xml && xml.xml) {
        const { historyService } = await import('../services/history-service');
        await historyService.saveVersion(activeTab.id, label, xml.xml);
        Toast.show('Punto de control guardado con éxito', 'success');
        if (inputCommit) inputCommit.value = '';
        renderHistoryPanel(state, container);
      }
    } catch {
      Toast.show('Error al guardar punto de control', 'error');
    }
  });

  container.querySelectorAll('.btn-restore').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const versionId = btn.getAttribute('data-version-id')!;
      if (
        !confirm(
          '¿Estás seguro de restaurar este punto de restauración? Los cambios no guardados se perderán.'
        )
      )
        return;

      const { historyService } = await import('../services/history-service');
      const tabVersions = await historyService.getVersions(activeTab.id);
      const version = tabVersions.find((v) => v.id === versionId);
      if (version && state.modeler) {
        try {
          await importDiagram(state.modeler, version.xml);
          activeTab.xml = version.xml;
          activeTab.isDirty = true;
          Toast.show('Punto de control restaurado correctamente', 'success');
          renderHistoryPanel(state, container);
        } catch {
          Toast.show('Error al restaurar punto de control', 'error');
        }
      }
    });
  });

  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const versionId = btn.getAttribute('data-version-id')!;
      const { historyService } = await import('../services/history-service');
      if (await historyService.deleteVersion(activeTab.id, versionId)) {
        Toast.show('Punto de control eliminado', 'success');
        renderHistoryPanel(state, container);
      }
    });
  });
}

export function refreshLogisticsPanel(state: AppState) {
  const panel = document.getElementById('logisticsPanel');
  if (panel) {
    renderLogisticsPanel(state, panel);
  }
}

export function refreshHistoryPanel(state: AppState) {
  const panel = document.getElementById('historyPanel');
  if (panel) {
    renderHistoryPanel(state, panel);
  }
}

async function renderXmlPanel(state: AppState, container: HTMLElement) {
  if (!state.modeler) return;
  try {
    const { xml } = await state.modeler.saveXML({ format: true });
    if (!xml) throw new Error('XML is empty');

    const escapedXml = xml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    container.innerHTML = `
      <div class="sidebar-scrollable">
        <div class="panel-section" style="height: 100%; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <h3 class="panel-section__title" style="margin-bottom: 0;">Código XML (Live)</h3>
            <button id="btnCopyLiveXml" class="btn btn--transparent" style="padding: 2px 8px; font-size: 11px;">Copiar</button>
          </div>
          <p class="section-desc">El código se actualiza automáticamente con cada cambio en el lienzo.</p>
          <pre style="flex: 1; background: var(--bg-surface); padding: 8px; border-radius: 4px; overflow: auto; font-size: 11px; border: 1px solid var(--border-color); white-space: pre-wrap; word-break: break-all; margin-top: 8px;"><code>${escapedXml}</code></pre>
        </div>
      </div>
    `;

    const btnCopy = document.getElementById('btnCopyLiveXml');
    btnCopy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(xml);
        Toast.show('XML copiado al portapapeles', 'success');
      } catch {
        Toast.show('No se pudo copiar el XML', 'error');
      }
    });
  } catch {
    container.innerHTML = `<div class="no-selection-alert">No se pudo cargar el XML en este momento.</div>`;
  }
}
