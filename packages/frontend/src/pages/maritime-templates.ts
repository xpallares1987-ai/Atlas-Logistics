export interface MaritimeTemplate {
  id: string;
  name: string;
  category: "FCL" | "LCL" | "SPECIAL";
  description: string;
  ports: string[];
  carrierSupport: string[];
  estimatedTransitTime: string;
  milestones: string[];
  xml: string;
}

export const MARITIME_TEMPLATES: MaritimeTemplate[] = [
  {
    id: "fcl-spain-export",
    name: "Exportación Marítima FCL Estándar (Valencia / Algeciras / Barcelona)",
    category: "FCL",
    description: "Flujo operativo integral para carga contenerizada completa (FCL 20'/40'/40'HC). Control de Booking, transporte terrestre, pesaje VGM SOLAS, despacho DUA AEAT (Circuitos Verde/Naranja/Rojo con PIF), entrega en terminal portuaria antes de Cut-Off y emisión de Bill of Lading (B/L).",
    ports: ["Valencia (ESVLC)", "Algeciras (ESALG)", "Barcelona (ESBCN)", "Bilbao (ESBIO)"],
    carrierSupport: ["MSC", "Maersk", "CMA CGM", "Hapag-Lloyd", "Cosco Shipping", "ONE"],
    estimatedTransitTime: "5 - 7 días pre-embarque",
    milestones: [
      "Confirmación Booking Naviera",
      "Posicionamiento en Fábrica / Depot",
      "Pesaje Oficial VGM SOLAS (VERMAS)",
      "Declaración DUA Exportación (AEAT / LER)",
      "Entrada Terminal Portuaria (CSP / APM / BEST)",
      "Carga a Bordo (Shipped on Board)",
      "Emisión B/L Master / House"
    ],
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_FCL_Export" targetNamespace="http://atlas-logistics.es/bpmn/maritime">
  <bpmn:process id="Process_FCL_Export_ES" name="Exportación Marítima FCL desde España" isExecutable="true">
    <bpmn:startEvent id="Start_FCL_Order" name="Solicitud de Reserva FCL">
      <bpmn:outgoing>Flow_To_Booking</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_Booking_Carrier" name="1. Solicitud &amp; Confirmación Booking (MSC/Maersk/CMA CGM)">
      <bpmn:incoming>Flow_To_Booking</bpmn:incoming>
      <bpmn:outgoing>Flow_To_Positioning</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Container_Positioning" name="2. Posicionamiento Terrestre &amp; Carga Fábrica (Precinto ISO 17712)">
      <bpmn:incoming>Flow_To_Positioning</bpmn:incoming>
      <bpmn:outgoing>Flow_To_VGM</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_VGM_SOLAS" name="3. Pesaje Certificado VGM SOLAS (Método 1 / EDI VERMAS)">
      <bpmn:incoming>Flow_To_VGM</bpmn:incoming>
      <bpmn:outgoing>Flow_To_DUA</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Customs_DUA" name="4. Confección &amp; Transmisión DUA Exportación (AEAT)">
      <bpmn:incoming>Flow_To_DUA</bpmn:incoming>
      <bpmn:outgoing>Flow_To_Gateway_Customs</bpmn:outgoing>
    </bpmn:task>
    <bpmn:exclusiveGateway id="Gateway_Customs_Circuit" name="Evaluación Circuito Aduanero">
      <bpmn:incoming>Flow_To_Gateway_Customs</bpmn:incoming>
      <bpmn:outgoing>Flow_Green_Channel</bpmn:outgoing>
      <bpmn:outgoing>Flow_Red_Orange_Channel</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:task id="Task_Physical_Inspection_PIF" name="4b. Inspección Física / Documental (PIF / Escáner)">
      <bpmn:incoming>Flow_Red_Orange_Channel</bpmn:incoming>
      <bpmn:outgoing>Flow_From_PIF</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Port_Terminal_GateIn" name="5. Entrada en Terminal Portuaria (Control Port Cut-Off)">
      <bpmn:incoming>Flow_Green_Channel</bpmn:incoming>
      <bpmn:incoming>Flow_From_PIF</bpmn:incoming>
      <bpmn:outgoing>Flow_To_Stowage</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Vessel_Loading" name="6. Estiba en Buque &amp; Confirmación Shipped on Board">
      <bpmn:incoming>Flow_To_Stowage</bpmn:incoming>
      <bpmn:outgoing>Flow_To_BL</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_BL_Release" name="7. Emisión y Liberación Bill of Lading (MBL/HBL Telex Release)">
      <bpmn:incoming>Flow_To_BL</bpmn:incoming>
      <bpmn:outgoing>Flow_To_End</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_FCL_Export" name="Exportación FCL Zarpe &amp; Notificación Consignee">
      <bpmn:incoming>Flow_To_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_To_Booking" sourceRef="Start_FCL_Order" targetRef="Task_Booking_Carrier" />
    <bpmn:sequenceFlow id="Flow_To_Positioning" sourceRef="Task_Booking_Carrier" targetRef="Task_Container_Positioning" />
    <bpmn:sequenceFlow id="Flow_To_VGM" sourceRef="Task_Container_Positioning" targetRef="Task_VGM_SOLAS" />
    <bpmn:sequenceFlow id="Flow_To_DUA" sourceRef="Task_VGM_SOLAS" targetRef="Task_Customs_DUA" />
    <bpmn:sequenceFlow id="Flow_To_Gateway_Customs" sourceRef="Task_Customs_DUA" targetRef="Gateway_Customs_Circuit" />
    <bpmn:sequenceFlow id="Flow_Green_Channel" name="Circuito Verde (Levante Inmediato)" sourceRef="Gateway_Customs_Circuit" targetRef="Task_Port_Terminal_GateIn" />
    <bpmn:sequenceFlow id="Flow_Red_Orange_Channel" name="Circuito Naranja / Rojo" sourceRef="Gateway_Customs_Circuit" targetRef="Task_Physical_Inspection_PIF" />
    <bpmn:sequenceFlow id="Flow_From_PIF" sourceRef="Task_Physical_Inspection_PIF" targetRef="Task_Port_Terminal_GateIn" />
    <bpmn:sequenceFlow id="Flow_To_Stowage" sourceRef="Task_Port_Terminal_GateIn" targetRef="Task_Vessel_Loading" />
    <bpmn:sequenceFlow id="Flow_To_BL" sourceRef="Task_Vessel_Loading" targetRef="Task_BL_Release" />
    <bpmn:sequenceFlow id="Flow_To_End" sourceRef="Task_BL_Release" targetRef="End_FCL_Export" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_FCL_Export_ES">
      <bpmndi:BPMNShape id="Start_FCL_Order_di" bpmnElement="Start_FCL_Order">
        <dc:Bounds x="80" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="56" y="205" width="85" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Booking_Carrier_di" bpmnElement="Task_Booking_Carrier">
        <dc:Bounds x="160" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Container_Positioning_di" bpmnElement="Task_Container_Positioning">
        <dc:Bounds x="330" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_VGM_SOLAS_di" bpmnElement="Task_VGM_SOLAS">
        <dc:Bounds x="500" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Customs_DUA_di" bpmnElement="Task_Customs_DUA">
        <dc:Bounds x="670" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Customs_Circuit_di" bpmnElement="Gateway_Customs_Circuit" isMarkerVisible="true">
        <dc:Bounds x="840" y="155" width="50" height="50" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="825" y="118" width="80" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Physical_Inspection_PIF_di" bpmnElement="Task_Physical_Inspection_PIF">
        <dc:Bounds x="800" y="270" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Port_Terminal_GateIn_di" bpmnElement="Task_Port_Terminal_GateIn">
        <dc:Bounds x="970" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Vessel_Loading_di" bpmnElement="Task_Vessel_Loading">
        <dc:Bounds x="1140" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_BL_Release_di" bpmnElement="Task_BL_Release">
        <dc:Bounds x="1310" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_FCL_Export_di" bpmnElement="End_FCL_Export">
        <dc:Bounds x="1482" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1458" y="205" width="86" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_To_Booking_di" bpmnElement="Flow_To_Booking">
        <di:waypoint x="116" y="180" />
        <di:waypoint x="160" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_Positioning_di" bpmnElement="Flow_To_Positioning">
        <di:waypoint x="290" y="180" />
        <di:waypoint x="330" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_VGM_di" bpmnElement="Flow_To_VGM">
        <di:waypoint x="460" y="180" />
        <di:waypoint x="500" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_DUA_di" bpmnElement="Flow_To_DUA">
        <di:waypoint x="630" y="180" />
        <di:waypoint x="670" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_Gateway_Customs_di" bpmnElement="Flow_To_Gateway_Customs">
        <di:waypoint x="800" y="180" />
        <di:waypoint x="840" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Green_Channel_di" bpmnElement="Flow_Green_Channel">
        <di:waypoint x="890" y="180" />
        <di:waypoint x="970" y="180" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="891" y="146" width="78" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Red_Orange_Channel_di" bpmnElement="Flow_Red_Orange_Channel">
        <di:waypoint x="865" y="205" />
        <di:waypoint x="865" y="270" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="873" y="226" width="84" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_From_PIF_di" bpmnElement="Flow_From_PIF">
        <di:waypoint x="930" y="310" />
        <di:waypoint x="1035" y="310" />
        <di:waypoint x="1035" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_Stowage_di" bpmnElement="Flow_To_Stowage">
        <di:waypoint x="1100" y="180" />
        <di:waypoint x="1140" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_BL_di" bpmnElement="Flow_To_BL">
        <di:waypoint x="1270" y="180" />
        <di:waypoint x="1310" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_To_End_di" bpmnElement="Flow_To_End">
        <di:waypoint x="1440" y="180" />
        <di:waypoint x="1482" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
  },
  {
    id: "lcl-groupage-export",
    name: "Exportación Marítima LCL / Consolidación Grupaje (CFS)",
    category: "LCL",
    description: "Flujo para consolidación de carga parcial y grupaje en almacén regulador (CFS). Incluye cubicaje, pesado individual, confección de DUA de exportación por partida, carga en contenedor consolidador (Stuffing), pesaje conjunto VGM, emisión de House B/L por cliente y Master B/L a agente desconsolidador en destino.",
    ports: ["Valencia (CFS VLC)", "Barcelona (CFS ZAL)", "Bilbao (CFS Santurtzi)"],
    carrierSupport: ["Consolidadores Marítimos (Vanguard, ECU Worldwide, Neutral Virgin)"],
    estimatedTransitTime: "7 - 10 días consolidación y zarpe",
    milestones: [
      "Recepción en Almacén Regulador CFS",
      "Control de Pesos & Volúmenes (CBM)",
      "Despacho Aduanero Partida Individual DUA",
      "Consolidación & Estiba en Contenedor (Stuffing)",
      "Pesaje Conjunto VGM SOLAS",
      "Entrada a Terminal Portuaria",
      "Emisión House B/L a Clientes & Master B/L a Agente"
    ],
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_LCL_Export" targetNamespace="http://atlas-logistics.es/bpmn/maritime">
  <bpmn:process id="Process_LCL_Export_ES" name="Exportación Marítima LCL Grupaje" isExecutable="true">
    <bpmn:startEvent id="Start_LCL_Reception" name="Recepción Bultos en Almacén CFS">
      <bpmn:outgoing>Flow_LCL_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_LCL_Verification" name="1. Inspección de Bultos, Cubicaje (CBM) &amp; Pesaje">
      <bpmn:incoming>Flow_LCL_1</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_LCL_Customs" name="2. Tramitación DUA Exportación por Partida Individual">
      <bpmn:incoming>Flow_LCL_2</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_LCL_Stuffing" name="3. Consolidación &amp; Llenado de Contenedor (Stuffing)">
      <bpmn:incoming>Flow_LCL_3</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_4</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_LCL_VGM" name="4. Precintado &amp; Emisión VGM Contenedor Consolidado">
      <bpmn:incoming>Flow_LCL_4</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_5</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_LCL_Terminal" name="5. Transferencia a Terminal Portuaria y Embarque">
      <bpmn:incoming>Flow_LCL_5</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_6</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_LCL_BLs" name="6. Emisión HBLs a Clientes y MBL a Agente Destino">
      <bpmn:incoming>Flow_LCL_6</bpmn:incoming>
      <bpmn:outgoing>Flow_LCL_7</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_LCL_Export" name="Contenedor LCL en Tránsito con Pre-Alerta Destino">
      <bpmn:incoming>Flow_LCL_7</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_LCL_1" sourceRef="Start_LCL_Reception" targetRef="Task_LCL_Verification" />
    <bpmn:sequenceFlow id="Flow_LCL_2" sourceRef="Task_LCL_Verification" targetRef="Task_LCL_Customs" />
    <bpmn:sequenceFlow id="Flow_LCL_3" sourceRef="Task_LCL_Customs" targetRef="Task_LCL_Stuffing" />
    <bpmn:sequenceFlow id="Flow_LCL_4" sourceRef="Task_LCL_Stuffing" targetRef="Task_LCL_VGM" />
    <bpmn:sequenceFlow id="Flow_LCL_5" sourceRef="Task_LCL_VGM" targetRef="Task_LCL_Terminal" />
    <bpmn:sequenceFlow id="Flow_LCL_6" sourceRef="Task_LCL_Terminal" targetRef="Task_LCL_BLs" />
    <bpmn:sequenceFlow id="Flow_LCL_7" sourceRef="Task_LCL_BLs" targetRef="End_LCL_Export" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_LCL">
    <bpmndi:BPMNPlane id="BPMNPlane_LCL" bpmnElement="Process_LCL_Export_ES">
      <bpmndi:BPMNShape id="Start_LCL_di" bpmnElement="Start_LCL_Reception">
        <dc:Bounds x="80" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="56" y="205" width="85" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_Verification_di" bpmnElement="Task_LCL_Verification">
        <dc:Bounds x="160" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_Customs_di" bpmnElement="Task_LCL_Customs">
        <dc:Bounds x="330" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_Stuffing_di" bpmnElement="Task_LCL_Stuffing">
        <dc:Bounds x="500" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_VGM_di" bpmnElement="Task_LCL_VGM">
        <dc:Bounds x="670" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_Terminal_di" bpmnElement="Task_LCL_Terminal">
        <dc:Bounds x="840" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_LCL_BLs_di" bpmnElement="Task_LCL_BLs">
        <dc:Bounds x="1010" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_LCL_di" bpmnElement="End_LCL_Export">
        <dc:Bounds x="1182" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1158" y="205" width="85" height="40" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_LCL_1_di" bpmnElement="Flow_LCL_1">
        <di:waypoint x="116" y="180" />
        <di:waypoint x="160" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_2_di" bpmnElement="Flow_LCL_2">
        <di:waypoint x="290" y="180" />
        <di:waypoint x="330" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_3_di" bpmnElement="Flow_LCL_3">
        <di:waypoint x="460" y="180" />
        <di:waypoint x="500" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_4_di" bpmnElement="Flow_LCL_4">
        <di:waypoint x="630" y="180" />
        <di:waypoint x="670" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_5_di" bpmnElement="Flow_LCL_5">
        <di:waypoint x="800" y="180" />
        <di:waypoint x="840" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_6_di" bpmnElement="Flow_LCL_6">
        <di:waypoint x="970" y="180" />
        <di:waypoint x="1010" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_LCL_7_di" bpmnElement="Flow_LCL_7">
        <di:waypoint x="1140" y="180" />
        <di:waypoint x="1182" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
  },
  {
    id: "reefer-imo-export",
    name: "Exportación Especial: Mercancías Peligrosas (IMO) & Reefer Frío",
    category: "SPECIAL",
    description: "Flujo técnico de alta criticidad para productos químicos, inflamables o perecederos farmacéuticos/alimentarios bajo temperatura dirigida. Incluye validación de Ficha MSDS y Declaración IMO, Pre-Trip Inspection (PTI) de unidad Reefer, etiquetado Placarding, inspección Soivre/Fitosanitario y embarque directo (Direct Hit) en terminal.",
    ports: ["Algeciras (APM Reefer Gate)", "Valencia (CSP Coolport)", "Barcelona (BEST Reefer Depot)"],
    carrierSupport: ["MSC Reefer", "Maersk Cold-Chain", "CMA CGM Climactive", "Hapag-Lloyd ExtraFresh"],
    estimatedTransitTime: "3 - 5 días control riguroso",
    milestones: [
      "Aprobación Dpto. Mercancías Peligrosas Naviera (IMO)",
      "Pre-Trip Inspection (PTI) & Ajuste SetPoint",
      "Etiquetado Rombo Peligro (Placarding IMO)",
      "Certificados Para-aduaneros (SOIVRE / Fito / Sanidad)",
      "Pesaje VGM de Alta Precisión",
      "Acceso Vía Rápida Terminal (Direct Hit)",
      "Monitoreo Continuo DataLogger en Tránsito"
    ],
    xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_IMO_Reefer" targetNamespace="http://atlas-logistics.es/bpmn/maritime">
  <bpmn:process id="Process_IMO_Reefer_Export" name="Exportación Marítima IMO y Reefer" isExecutable="true">
    <bpmn:startEvent id="Start_Special_Order" name="Solicitud Carga IMO / Reefer">
      <bpmn:outgoing>Flow_Spec_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_IMO_Approval" name="1. Aprobación Técnica MSDS &amp; Clases IMO por Naviera">
      <bpmn:incoming>Flow_Spec_1</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Reefer_PTI" name="2. Inspección PTI &amp; Pre-Enfriamiento de la Unidad Reefer">
      <bpmn:incoming>Flow_Spec_2</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_3</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Placarding_Loading" name="3. Carga con Placarding IMO &amp; Colocación Datalogger Frío">
      <bpmn:incoming>Flow_Spec_3</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_4</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_ParaCustoms_Inspection" name="4. Inspección SOIVRE / Fitosanitario / Sanidad Exterior">
      <bpmn:incoming>Flow_Spec_4</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_5</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Direct_Hit_Terminal" name="5. Entrada Direct Hit en Terminal &amp; Conexión Eléctrica">
      <bpmn:incoming>Flow_Spec_5</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_6</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Task_Special_BL" name="6. Emisión B/L con Cláusulas IMO &amp; Temp Control">
      <bpmn:incoming>Flow_Spec_6</bpmn:incoming>
      <bpmn:outgoing>Flow_Spec_7</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="End_Special_Export" name="Zarpe Seguro Monitoreado 24/7">
      <bpmn:incoming>Flow_Spec_7</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Spec_1" sourceRef="Start_Special_Order" targetRef="Task_IMO_Approval" />
    <bpmn:sequenceFlow id="Flow_Spec_2" sourceRef="Task_IMO_Approval" targetRef="Task_Reefer_PTI" />
    <bpmn:sequenceFlow id="Flow_Spec_3" sourceRef="Task_Reefer_PTI" targetRef="Task_Placarding_Loading" />
    <bpmn:sequenceFlow id="Flow_Spec_4" sourceRef="Task_Placarding_Loading" targetRef="Task_ParaCustoms_Inspection" />
    <bpmn:sequenceFlow id="Flow_Spec_5" sourceRef="Task_ParaCustoms_Inspection" targetRef="Task_Direct_Hit_Terminal" />
    <bpmn:sequenceFlow id="Flow_Spec_6" sourceRef="Task_Direct_Hit_Terminal" targetRef="Task_Special_BL" />
    <bpmn:sequenceFlow id="Flow_Spec_7" sourceRef="Task_Special_BL" targetRef="End_Special_Export" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_IMO">
    <bpmndi:BPMNPlane id="BPMNPlane_IMO" bpmnElement="Process_IMO_Reefer_Export">
      <bpmndi:BPMNShape id="Start_Special_di" bpmnElement="Start_Special_Order">
        <dc:Bounds x="80" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="56" y="205" width="85" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_IMO_Approval_di" bpmnElement="Task_IMO_Approval">
        <dc:Bounds x="160" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Reefer_PTI_di" bpmnElement="Task_Reefer_PTI">
        <dc:Bounds x="330" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Placarding_Loading_di" bpmnElement="Task_Placarding_Loading">
        <dc:Bounds x="500" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ParaCustoms_Inspection_di" bpmnElement="Task_ParaCustoms_Inspection">
        <dc:Bounds x="670" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Direct_Hit_Terminal_di" bpmnElement="Task_Direct_Hit_Terminal">
        <dc:Bounds x="840" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Special_BL_di" bpmnElement="Task_Special_BL">
        <dc:Bounds x="1010" y="140" width="130" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_Special_di" bpmnElement="End_Special_Export">
        <dc:Bounds x="1182" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="1158" y="205" width="85" height="27" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Spec_1_di" bpmnElement="Flow_Spec_1">
        <di:waypoint x="116" y="180" />
        <di:waypoint x="160" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_2_di" bpmnElement="Flow_Spec_2">
        <di:waypoint x="290" y="180" />
        <di:waypoint x="330" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_3_di" bpmnElement="Flow_Spec_3">
        <di:waypoint x="460" y="180" />
        <di:waypoint x="500" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_4_di" bpmnElement="Flow_Spec_4">
        <di:waypoint x="630" y="180" />
        <di:waypoint x="670" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_5_di" bpmnElement="Flow_Spec_5">
        <di:waypoint x="800" y="180" />
        <di:waypoint x="840" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_6_di" bpmnElement="Flow_Spec_6">
        <di:waypoint x="970" y="180" />
        <di:waypoint x="1010" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Spec_7_di" bpmnElement="Flow_Spec_7">
        <di:waypoint x="1140" y="180" />
        <di:waypoint x="1182" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
  }
];
