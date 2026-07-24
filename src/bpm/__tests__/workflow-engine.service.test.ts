import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startWorkflow,
  enqueueElement,
  bullWorker,
} from "../workflow-engine.service.js";
import { db } from "../../db/db.config.js";
import {
  workflows,
  workflowTasks,
  workflowDefinitions,
} from "../../db/schema.js";

// Mock DB, logger, and Redis
vi.mock("../../db/db.config.js", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("../../config/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockBPMNParser = {
  getStartEvent: vi.fn(),
  getNextNodes: vi.fn(),
};

vi.mock("../utils/bpmn-parser.js", () => {
  return {
    BPMNParser: vi.fn().mockImplementation(() => mockBPMNParser),
  };
});

describe("Workflow Engine Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  it("should start a workflow, parse XML, and enqueue the next element", async () => {
    const mockXmlData = "<bpmn:definitions></bpmn:definitions>";
    const workflowName = "test-workflow";
    const mockWorkflowId = "wf-123";

    // Mocking the DB chain for workflowDefinitions
    const mockDb = db as any;
    mockDb.limit.mockResolvedValueOnce([{ xmlData: mockXmlData }]);

    // Mocking BPMNParser methods
    mockBPMNParser.getStartEvent.mockReturnValue({ id: "startEvent_1" });
    mockBPMNParser.getNextNodes.mockReturnValue([
      { id: "task_1", type: "serviceTask", taskType: "test-task" },
    ]);

    // Mocking workflow insertion
    mockDb.returning.mockResolvedValueOnce([{ id: mockWorkflowId }]);

    const result = await startWorkflow(workflowName, { test: true });

    expect(result).toBe(mockWorkflowId);
    expect(mockDb.insert).toHaveBeenCalledWith(workflows);
    expect(mockBPMNParser.getStartEvent).toHaveBeenCalled();
    expect(mockBPMNParser.getNextNodes).toHaveBeenCalledWith("startEvent_1");
  });

  it("should throw an error if workflow definition is not found", async () => {
    const mockDb = db as any;
    mockDb.limit.mockResolvedValueOnce([]); // No results

    await expect(startWorkflow("non-existent-wf")).rejects.toThrow(/not found/);
  });
});
