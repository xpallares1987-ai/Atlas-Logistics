import { DocumentRecord, TrackingMilestone, ContainerTracking } from '@/types/schema';

class DatabaseService {
  private documents: DocumentRecord[] = [
    {
      id: 'doc-1',
      bookingRef: 'BKG-2023-001',
      type: 'HBL',
      documentNumber: 'HBL-990812',
      issueDate: new Date().toISOString(),
      status: 'DRAFT',
      payload: { 
        shipper: 'Global Industries LLC',
        consignee: 'Acme Corporation Ltd',
        notifyParty: 'Same as Consignee',
        preCarriageBy: '',
        placeOfReceipt: 'Los Angeles, CA',
        vesselVoyage: 'MSC GULSUN / 024W',
        portOfLoading: 'USLAX',
        portOfDischarge: 'ESBCN',
        placeOfDelivery: 'Barcelona, ESP',
        freightPayableAt: 'DESTINATION',
        numberOfOriginals: 'THREE (3)',
        declaredValue: 'N/A',
        freightTerms: 'COLLECT',
        lines: [
          {
            id: 'line-1',
            marks: 'MSCU1234567\nSEAL: 887766', 
            pkgs: '10 PLT', 
            description: 'ELECTRONIC COMPONENTS', 
            weight: '12,500 KGS', 
            measurement: '24.5 CBM' 
          }
        ],
        remarks: 'FREIGHT COLLECT'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];
  
  private milestones: TrackingMilestone[] = [
    {
      id: 'mil-1',
      shipmentId: 'shp-1',
      type: 'ETD',
      location: 'USLAX',
      date: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
      description: 'Estimated Time of Departure',
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    },
    {
      id: 'mil-2',
      shipmentId: 'shp-1',
      type: 'ETA',
      location: 'ESBCN',
      date: new Date(Date.now() + 15 * 24 * 3600000).toISOString(),
      description: 'Estimated Time of Arrival',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    }
  ];

  private containers: ContainerTracking[] = [
    {
      id: 'cnt-1',
      shipmentId: 'shp-1',
      containerNumber: 'MSCU1234567',
      type: '40HC',
      sealNumber: '887766',
      currentStatus: 'LOADED_ON_VESSEL',
      lastLocation: 'USLAX'
    }
  ];

  // Document Operations
  async getDocuments(): Promise<DocumentRecord[]> {
    return Promise.resolve([...this.documents]);
  }

  async getDocumentById(id: string): Promise<DocumentRecord | undefined> {
    return Promise.resolve(this.documents.find(d => d.id === id));
  }

  async createDocument(data: Omit<DocumentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentRecord> {
    const newDoc: DocumentRecord = {
      ...data,
      id: `doc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.documents.push(newDoc);
    return Promise.resolve(newDoc);
  }

  // Tracking Operations
  async getMilestonesByShipment(shipmentId: string): Promise<TrackingMilestone[]> {
    return Promise.resolve(this.milestones.filter(m => m.shipmentId === shipmentId));
  }

  async getContainersByShipment(shipmentId: string): Promise<ContainerTracking[]> {
    return Promise.resolve(this.containers.filter(c => c.shipmentId === shipmentId));
  }
}

export const db = new DatabaseService();
