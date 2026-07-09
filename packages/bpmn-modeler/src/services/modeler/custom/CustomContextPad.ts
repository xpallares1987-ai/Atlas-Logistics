export default class CustomContextPad {
  static $inject: string[];
  _contextPad: any;
  _create: any;
  _elementFactory: any;
  _translate: any;

  constructor(contextPad: any, create: any, elementFactory: any, translate: any) {
    this._contextPad = contextPad;
    this._create = create;
    this._elementFactory = elementFactory;
    this._translate = translate;

    contextPad.registerProvider(this);
  }

  getContextPadEntries(element: any) {
    const { _create, _elementFactory, _translate } = this;

    function appendAction(type: string, className: string, title: string, options?: any) {
      function appendListener(event: any, element: any) {
        const shape = _elementFactory.createShape({ type, ...options });
        _create.start(event, shape, element);
      }

      return {
        group: 'model',
        className,
        title: _translate(title),
        action: {
          dragstart: appendListener,
          click: appendListener,
        },
      };
    }

    if (
      element.type === 'bpmn:UserTask' ||
      element.type === 'bpmn:Task' ||
      element.type === 'bpmn:StartEvent'
    ) {
      return {
        'append.customs-task': appendAction(
          'bpmn:Task',
          'bpmn-icon-customs',
          'Añadir Tarea de Aduanas',
          { businessObject: { name: 'Despacho Aduanas' } }
        ),
        'append.warehouse-task': appendAction(
          'bpmn:Task',
          'bpmn-icon-warehouse',
          'Añadir Tarea de Almacén',
          { businessObject: { name: 'Recepción Almacén' } }
        ),
      };
    }

    return {};
  }
}

CustomContextPad.$inject = ['contextPad', 'create', 'elementFactory', 'translate'];
