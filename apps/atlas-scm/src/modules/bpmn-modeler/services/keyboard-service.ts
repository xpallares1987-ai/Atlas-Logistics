import Modeler from 'bpmn-js/lib/Modeler';

export function initCustomKeyboard(modeler: Modeler) {
  if (!modeler) return;

  const keyboard = modeler.get('keyboard') as any;
  const editorActions = modeler.get('editorActions') as any;
  const selection = modeler.get('selection') as any;
  const bpmnReplace = modeler.get('bpmnReplace') as any;

  if (!editorActions._actions['append-task']) {
    editorActions.register({
      'append-task': () => {
        const selected = selection.get()[0];
        if (selected) editorActions.trigger('append', { type: 'bpmn:Task', source: selected });
      },
      'append-gateway': () => {
        const selected = selection.get()[0];
        if (selected) editorActions.trigger('append', { type: 'bpmn:ExclusiveGateway', source: selected });
      },
      'append-end-event': () => {
        const selected = selection.get()[0];
        if (selected) editorActions.trigger('append', { type: 'bpmn:EndEvent', source: selected });
      },
      'replace-with-service-task': () => {
        const selected = selection.get()[0];
        if (selected) bpmnReplace.replaceElement(selected, { type: 'bpmn:ServiceTask' });
      },
      'replace-with-user-task': () => {
        const selected = selection.get()[0];
        if (selected) bpmnReplace.replaceElement(selected, { type: 'bpmn:UserTask' });
      },
    });
  }

  keyboard.addListener(1000, (context: any) => {
    const event = context.keyEvent;

    if (keyboard.isShared(event)) return;

    const { key } = event;

    if (key === 't' || key === 'T') {
      editorActions.trigger('append-task');
      return true;
    }
    if (key === 'g' || key === 'G') {
      editorActions.trigger('append-gateway');
      return true;
    }
    if (key === 'e' || key === 'E') {
      editorActions.trigger('append-end-event');
      return true;
    }
    if (key === 's' || key === 'S') {
      editorActions.trigger('replace-with-service-task');
      return true;
    }
    if (key === 'u' || key === 'U') {
      editorActions.trigger('replace-with-user-task');
      return true;
    }

    return undefined;
  });
}
