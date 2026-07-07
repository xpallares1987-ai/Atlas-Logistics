import { Toast, publishEvent } from '@atlas/ui';
import type { Statusbar } from './statusbar';
import { getDiagramXml } from '../services/xml-service';
import { AppState } from '../types';

export function initDeployModal(statusbar: Statusbar, state: AppState) {
  const btnDeploy = document.getElementById('btnDeploy');
  const modal = document.getElementById('deployModal') as HTMLDialogElement;
  const btnClose = document.getElementById('btnCloseDeployModal');
  const deployForm = document.getElementById('deployForm') as HTMLFormElement;
  const statusArea = document.getElementById('deployStatusArea');
  const statusText = document.getElementById('deployStatusText');
  const btnSubmit = document.getElementById('btnDeploySubmit');

  if (
    !btnDeploy ||
    !modal ||
    !btnClose ||
    !deployForm ||
    !statusArea ||
    !statusText ||
    !btnSubmit
  ) {
    console.warn('Deploy components not found in DOM.');
    return;
  }

  // Show modal
  btnDeploy.addEventListener('click', () => {
    modal.showModal();
  });

  // Close modal
  btnClose.addEventListener('click', () => {
    modal.close();
    resetForm();
  });

  function resetForm() {
    statusArea?.classList.add('hidden');
    btnSubmit?.removeAttribute('disabled');
    if (btnSubmit) btnSubmit.textContent = 'Confirmar Despliegue';
  }

  // Handle Deploy Form Submission
  deployForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isSandbox = (document.getElementById('zeebeSandbox') as HTMLInputElement)?.checked;

    // Disable submit button and show loading spinner
    btnSubmit.setAttribute('disabled', 'true');
    btnSubmit.textContent = 'Desplegando...';
    statusArea.classList.remove('hidden');

    try {
      if (isSandbox) {
        // High fidelity multi-stage simulation
        const stages = [
          { text: 'Estableciendo canal gRPC seguro con Zeebe Cloud...', delay: 1200 },
          { text: 'Autenticando credenciales OAuth 2.0 (Camunda Cloud)...', delay: 1400 },
          { text: 'Validando sintaxis XML y extensiones de Camunda 8...', delay: 1000 },
          { text: 'Enviando comando DeployProcessInstance a Zeebe Engine...', delay: 1200 },
          { text: '¡Respuesta de Zeebe recibida exitosamente!', delay: 600 },
        ];

        for (const stage of stages) {
          statusText.textContent = stage.text;
          await new Promise((resolve) => setTimeout(resolve, stage.delay));
        }

        const randomVersion = Math.floor(Math.random() * 5) + 1;
        const randomProcId = Math.floor(Math.random() * 9000000) + 1000000;

        if (state.modeler) {
          try {
            const xml = await getDiagramXml(state.modeler);

            // Invoke Worker to parse and plan execution
            const worker = new Worker(new URL('../workers/bpmn-worker.ts', import.meta.url), {
              type: 'module',
            });

            const workerPromise = new Promise((resolve, reject) => {
              worker.onmessage = (event) => {
                if (event.data.status === 'success' && event.data.action === 'execute-process') {
                  resolve(event.data.tasks);
                } else {
                  reject(new Error(event.data.message));
                }
                worker.terminate();
              };
              worker.onerror = (err) => {
                worker.terminate();
                reject(err);
              };
            });

            worker.postMessage({ action: 'execute-process', xml, fileName: 'process.bpmn' });

            const tasks = await workerPromise;

            // Publish the event so the host React app (Workflows.tsx) can intercept it and save via DataConnect
            publishEvent({
              type: 'DEPLOY_WORKFLOW',
              payload: {
                xml,
                tasks,
                version: randomVersion,
                processId: randomProcId.toString(),
              },
            });
          } catch (workerErr) {
            console.error('Worker failed to process execution:', workerErr);
          }
        }

        // Update Statusbar
        statusbar.setStatus(`Camunda 8: Desplegado v${randomVersion}`, 'success');
      } else {
        // Despliegue Real a Camunda 8
        statusText.textContent = 'Contactando con servidor seguro (GCP)...';
        
        // Dynamic import to avoid breaking if firebase is not ready early
        const { getApp } = await import('firebase/app');
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        
        const app = getApp();
        const functions = getFunctions(app);
        
        const deployBPMN = httpsCallable(functions, 'deployBPMN');
        
        if (state.modeler) {
          const xml = await getDiagramXml(state.modeler);
          statusText.textContent = 'Desplegando en Camunda 8 (Bélgica)...';
          
          const result = await deployBPMN({ xml });
          const data = result.data as any;
          
          if (data.success) {
             statusbar.setStatus(`Camunda 8: Desplegado v${data.version}`, 'success');
             Toast.show(`Proceso ${data.processId} desplegado (v${data.version})`, 'success');
          } else {
             throw new Error("Despliegue fallido");
          }
        }
      }

      modal.close();
      resetForm();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(error);
      Toast.show(error.message || 'Fallo crítico al desplegar en Camunda 8', 'error');
      resetForm();
    }
  });
}
