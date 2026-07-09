export const bpmnHtml = `<div class="app-shell" style="height: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; position: relative;">
      <header class="topbar">
        <div class="topbar__brand">
          <h1 class="topbar__title">BPMN 2.0 Interactive Modeler</h1>
          <span class="topbar__subtitle"> V 1.0 </span>
        </div>

        <nav class="topbar__actions">
          <button id="btnNew" class="btn" type="button" aria-label="Crear nuevo diagrama">
            <img src="./assets/icons/new.svg" class="btn-icon" alt="Nuevo" />
            Nuevo
          </button>
          <button id="btnOpen" class="btn" type="button" aria-label="Abrir diagrama local">
            <img src="./assets/icons/open.svg" class="btn-icon" alt="Abrir" />
            Abrir
          </button>
          <button id="btnSave" class="btn btn--primary" type="button" aria-label="Guardar diagrama">
            <img src="./assets/icons/save.svg" class="btn-icon" alt="Guardar" />
            Guardar
          </button>
          <button id="btnExport" class="btn" type="button" aria-label="Exportar como imagen">
            <img src="./assets/icons/image.svg" class="btn-icon" alt="Imagen" />
            Imagen
          </button>
          <button id="btnCopyXml" class="btn" type="button" aria-label="Copiar código XML">
            <img src="./assets/icons/save.svg" class="btn-icon btn-icon--rotated" alt="XML" />
            Copiar XML
          </button>
          <button
            id="btnLogistics"
            class="btn"
            type="button"
            aria-label="Ver plantillas logísticas"
          >
            <img src="./assets/icons/logistics.svg" class="btn-icon" alt="Logística" />
            Logística
          </button>
          <button id="btnSop" class="btn" type="button" aria-label="Generar SOP">SOP</button>
          <button id="btnCloud" class="btn" type="button" aria-label="Sincronización en la nube">
            <img src="./assets/icons/cloud.svg" class="btn-icon" alt="Nube" />
            Nube
          </button>
          <button
            id="btnDeploy"
            class="btn btn--primary"
            type="button"
            aria-label="Desplegar a Camunda 8"
          >
            Desplegar
          </button>
          <div class="divider"></div>
          <button id="btnTheme" class="btn" type="button" aria-label="Cambiar tema visual">
            Tema
          </button>
          <button id="btnShortcuts" class="btn" type="button">Atajos</button>
          <button id="btnDiff" class="btn" type="button" aria-label="Comparar versiones">
            Comparar
          </button>
          <button id="btnVersions" class="btn" type="button" aria-label="Historial de versiones">
            Versiones
          </button>
          <button id="btnToggleProperties" class="btn" type="button">Propiedades</button>
        </nav>
      </header>

      <main class="workspace">
        <section class="canvas-panel">
          <div class="tabs-bar">
            <div id="tabsContainer" class="tabs-container"></div>
            <button id="btnAddTab" class="btn btn--transparent btn--add-tab" type="button">
              +
            </button>
          </div>
          <div class="canvas-panel__header">
            <span> Editor de Procesos </span>
            <span id="diagramName"> Proceso en blanco </span>
            <div class="search-box">
              <span class="search-box__icon">🔍</span>
              <input
                type="text"
                id="diagramSearch"
                name="diagramSearch"
                placeholder="Buscar elemento..."
                class="search-box__input"
                autocomplete="off"
              />
            </div>
          </div>
          <div id="canvas" class="canvas-panel__body"></div>

          <div class="canvas-controls">
            <button id="btnMinimap" class="control-btn" title="Alternar Mapa" type="button">
              🗺️
            </button>
            <button id="btnFit" class="control-btn" title="Ajustar Vista" type="button">⛶</button>
            <button id="btnZoomIn" class="control-btn" title="Aumentar Zoom" type="button">
              +
            </button>
            <button id="btnZoomOut" class="control-btn" title="Reducir Zoom" type="button">
              -
            </button>
          </div>
        </section>

        <aside id="propertiesSidebar" class="sidebar">
          <div class="sidebar__header">
            <h2 class="sidebar__title">Propiedades</h2>
          </div>
          <div id="properties" class="sidebar__body"></div>
        </aside>
      </main>

      <footer class="statusbar">
        <div id="statusText">Listo</div>
        <div id="autoSaveText" class="statusbar__auto-save-text"></div>
        <div id="selectionText">Sin selección</div>
      </footer>
    </div>

    <div id="toastContainer" class="toast-container"></div>
    <input
      id="fileInput"
      type="file"
      accept=".bpmn,.xml"
      name="fileInput"
      autocomplete="off"
      hidden
    />

    <dialog id="shortcutsModal" class="modal">
      <div class="modal__header">
        <h2 class="modal__title">Atajos de Teclado</h2>
        <button id="btnCloseModal" class="btn--close" type="button">&times;</button>
      </div>
      <div class="modal__body">
        <table class="shortcuts-table">
          <tr>
            <td>Deshacer / Rehacer</td>
            <td>
              <kbd> Ctrl+Z </kbd>
              /
              <kbd> Ctrl+Y </kbd>
            </td>
          </tr>
          <tr>
            <td>Copiar / Pegar</td>
            <td>
              <kbd> Ctrl+C </kbd>
              /
              <kbd> Ctrl+V </kbd>
            </td>
          </tr>
          <tr>
            <td>Eliminar</td>
            <td>
              <kbd> Supr </kbd>
            </td>
          </tr>
        </table>
      </div>
    </dialog>

    <dialog id="cloudModal" class="modal">
      <div class="modal__header">
        <h2 class="modal__title">Sincronización en la Nube</h2>
        <button id="btnCloseCloudModal" class="btn--close" type="button">&times;</button>
      </div>
      <form id="cloudForm" class="modal__body" autocomplete="on">
        <!-- Accessibility: Hidden username field for password manager compatibility -->
        <div class="hidden">
          <input
            type="text"
            id="githubUsername"
            name="username"
            autocomplete="username"
            value="GitHub-User"
          />
        </div>

        <div class="form-group">
          <label for="githubToken"> Personal Access Token </label>
          <input
            type="password"
            id="githubToken"
            name="githubToken"
            class="input"
            placeholder="ghp_xxxxxxxxxxxx"
            autocomplete="current-password"
            required
          />
          <p class="help-text">Los diagramas se guardarán de forma privada.</p>
        </div>
        <button id="btnCloudSync" class="btn btn--primary btn--full-width" type="submit">
          Sincronizar ahora
        </button>
      </form>
    </dialog>

    <dialog id="logisticsModal" class="modal modal--large">
      <div class="modal__header">
        <h2 class="modal__title">Plantillas de Freight Forwarding</h2>
        <button id="btnCloseLogisticsModal" class="btn--close" type="button">&times;</button>
      </div>
      <div class="modal__body">
        <p class="modal__description">
          Selecciona un proceso predefinido para comenzar rápidamente con tus operaciones
          logísticas.
        </p>
        <div id="logisticsTemplatesList" class="templates-grid">
          <!-- Las plantillas se renderizarán dinámicamente -->
        </div>
      </div>
    </dialog>

    <dialog id="deployModal" class="modal">
      <div class="modal__header">
        <h2 class="modal__title">Desplegar a Camunda 8 (Zeebe)</h2>
        <button id="btnCloseDeployModal" class="btn--close" type="button">&times;</button>
      </div>
      <form id="deployForm" class="modal__body" autocomplete="on">
        <div class="form-group">
          <label for="zeebeEndpoint">Zeebe API Endpoint</label>
          <input
            type="url"
            id="zeebeEndpoint"
            class="input"
            placeholder="https://bru-2.zeebe.camunda.io:443"
            value="https://sandbox.zeebe.camunda.io:443"
            autocomplete="url"
            required
          />
        </div>
        <div class="form-group">
          <label for="zeebeClientId">Client ID</label>
          <input
            type="text"
            id="zeebeClientId"
            class="input"
            placeholder="Client ID de la consola de Camunda"
            value="C8-Sandbox-Client"
            autocomplete="username"
            required
          />
        </div>
        <div class="form-group">
          <label for="zeebeClientSecret">Client Secret</label>
          <input
            type="password"
            id="zeebeClientSecret"
            class="input"
            placeholder="Secret del API"
            value="••••••••••••••••"
            autocomplete="current-password"
            required
          />
        </div>
        <div
          class="form-group"
          style="display: flex; align-items: center; gap: 8px; margin-top: 16px"
        >
          <input type="checkbox" id="zeebeSandbox" checked style="width: 16px; height: 16px" />
          <label for="zeebeSandbox" style="margin-bottom: 0; cursor: pointer"
            >Simulación del Entorno de Pruebas (Sandbox)</label
          >
        </div>

        <div
          id="deployStatusArea"
          class="hidden"
          style="
            margin-top: 16px;
            padding: 12px;
            background: var(--primary-soft);
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            text-align: center;
          "
        >
          <div
            class="spinner"
            style="
              border: 3px solid rgba(0, 0, 0, 0.1);
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border-left-color: var(--primary);
              animation: spin 1s linear infinite;
              margin: 0 auto 8px auto;
            "
          ></div>
          <style>
            @keyframes spin {
              0% {
                transform: rotate(0deg);
              }
              100% {
                transform: rotate(360deg);
              }
            }
          </style>
          <div
            id="deployStatusText"
            style="font-size: 11px; font-weight: 600; color: var(--primary)"
          >
            Estableciendo canal gRPC con Zeebe...
          </div>
        </div>

        <button id="btnDeploySubmit" class="btn btn--primary btn--full-width" type="submit">
          Confirmar Despliegue
        </button>
      </form>
    </dialog>

    
  
`;
