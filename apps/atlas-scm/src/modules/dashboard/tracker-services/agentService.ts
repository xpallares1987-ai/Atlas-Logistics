import { Agent } from "../types";

export interface IAgentService {
  /**
   * Retrieves all available logistics agents.
   */
  getAgents(): Promise<Agent[]>;

  /**
   * Retrieves a specific agent by ID.
   */
  getAgentById(id: string): Promise<Agent | undefined>;
}

const mockAgents: Agent[] = [
  {
    id: "a1",
    name: "Xavier Pallarès",
    role: "Global Logistics Manager",
    region: "Europe/HQ",
    email: "xpallares@example.com",
    phone: "+34 600 000 000",
    status: "active",
    specialties: ["Customs", "Air Freight"],
  },
  {
    id: "a2",
    name: "Li Wei",
    role: "Asia Operations Lead",
    region: "Shanghai/Ningbo",
    email: "l.wei@example.com",
    phone: "+86 21 0000 0000",
    status: "active",
    specialties: ["Sea Export", "Warehouse"],
  },
  {
    id: "a3",
    name: "Carlos Rodriguez",
    role: "LATAM Agent",
    region: "Mexico/Panama",
    email: "c.rodriguez@example.com",
    phone: "+52 55 0000 0000",
    status: "away",
    specialties: ["Trucking", "Port Ops"],
  },
];

export class AgentServiceImpl implements IAgentService {
  private agents: Agent[];

  constructor(initialAgents: Agent[] = mockAgents) {
    this.agents = initialAgents;
  }

  async getAgents(): Promise<Agent[]> {
    // Simulated network delay can be added here
    return this.agents;
  }

  async getAgentById(id: string): Promise<Agent | undefined> {
    return this.agents.find((agent) => agent.id === id);
  }
}

// Export singleton instance for direct use, while allowing class import for DI in tests.
export const AgentService = new AgentServiceImpl();
