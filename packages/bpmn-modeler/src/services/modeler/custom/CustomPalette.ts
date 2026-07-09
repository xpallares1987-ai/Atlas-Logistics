export default class CustomPalette {
  static $inject: string[];
  _palette: any;
  _create: any;
  _elementFactory: any;
  _translate: any;

  constructor(palette: any, create: any, elementFactory: any, translate: any) {
    this._palette = palette;
    this._create = create;
    this._elementFactory = elementFactory;
    this._translate = translate;

    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const { _create, _elementFactory, _translate } = this;

    function createAction(
      type: string,
      group: string,
      className: string,
      title: string,
      options?: any
    ) {
      function createListener(event: any) {
        const shape = _elementFactory.createShape({ type, ...options });
        _create.start(event, shape);
      }

      return {
        group,
        className,
        title: _translate(title),
        action: {
          dragstart: createListener,
          click: createListener,
        },
      };
    }

    return {
      'custom-separator': {
        group: 'logistics',
        separator: true,
      },
      'create.customs-task': createAction(
        'bpmn:Task',
        'logistics',
        'bpmn-icon-customs',
        'Tarea de Aduanas',
        { businessObject: { name: 'Despacho Aduanas' } }
      ),
      'create.warehouse-task': createAction(
        'bpmn:Task',
        'logistics',
        'bpmn-icon-warehouse',
        'Tarea de Almacén',
        { businessObject: { name: 'Recepción Almacén' } }
      ),
      'create.lcl-task': createAction(
        'bpmn:Task',
        'logistics',
        'bpmn-icon-lcl',
        'Consolidación LCL',
        { businessObject: { name: 'Consolidación LCL' } }
      ),
      'create.crossdock-task': createAction(
        'bpmn:Task',
        'logistics',
        'bpmn-icon-crossdock',
        'Cross-docking',
        { businessObject: { name: 'Operación Cross-dock' } }
      ),
    };
  }
}

CustomPalette.$inject = ['palette', 'create', 'elementFactory', 'translate'];
