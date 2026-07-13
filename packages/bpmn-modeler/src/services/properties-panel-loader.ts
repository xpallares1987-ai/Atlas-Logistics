export async function loadPropertiesModules(camunda8: boolean, zeebeSupport: boolean) {
  const { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, ZeebePropertiesProviderModule } =
    await import('bpmn-js-properties-panel');

  await import('@bpmn-io/properties-panel/dist/assets/properties-panel.css');

  const modules = [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule];

  if (camunda8 && zeebeSupport) {
    modules.push(ZeebePropertiesProviderModule);
  }

  return modules;
}
