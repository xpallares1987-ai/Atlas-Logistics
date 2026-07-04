import { Toast } from '@torre/ui';
import type { Statusbar } from './statusbar';

export function initDeployModal(statusbar: Statusbar) {
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

        Toast.show(
          `¡Proceso desplegado con éxito! Versión: ${randomVersion} (ID: ${randomProcId})`,
          'success'
        );

        // Update Statusbar
        statusbar.setStatus(`Camunda 8: Desplegado v${randomVersion}`, 'success');
      } else {
        // Simulate a real attempt that prompts cluster credentials alert
        statusText.textContent = 'Conectando con cluster externo...';
        await new Promise((resolve) => setTimeout(resolve, 2000));
        throw new Error(
          'No se pudo establecer conexión de confianza gRPC. Verifique su certificado SSL o use el modo Sandbox.'
        );
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
