import { z } from "zod";

export const TaskStatusEnum = z.enum(["PICK", "PACK", "DISPATCH", "COMPLETED"]);
export const TaskPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const TaskIdParamsSchema = z.object({
  id: z.string().min(1, "Task ID is required"),
});

export const UpdateTaskStatusSchema = z.object({
  status: TaskStatusEnum,
});

export const CreateTaskSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: TaskStatusEnum.optional().default("PICK"),
  priority: TaskPriorityEnum.optional().default("NORMAL"),
  assignedTo: z.string().optional().nullable(),
});

export const TrafficStatusEnum = z.enum([
  "WAITING",
  "DOCK_ASSIGNED",
  "ARRIVING",
  "AT_DOCK",
  "COMPLETED",
  "Arriving",
  "At Dock",
  "Completed",
]);

export const TrafficIdParamsSchema = z.object({
  id: z.string().min(1, "Traffic ID is required"),
});

export const UpdateTrafficSchema = z.object({
  status: z.string().optional(),
  assignedDock: z.string().optional().nullable(),
  eta: z.string().optional().nullable(),
});

export const CreateTrafficSchema = z.object({
  deviceNumber: z.string().min(1, "Device number is required"),
  driverName: z.string().optional(),
  deviceType: z.string().optional().default("TRUCK"),
  status: z.string().optional().default("WAITING"),
  eta: z.string().optional().nullable(),
  assignedDock: z.string().optional().nullable(),
  cargoDescription: z.string().optional().nullable(),
  totalWeightExpected: z.number().optional().nullable(),
  expectedQuantity: z.number().optional().default(1),
  type: z.enum(["INBOUND", "OUTBOUND"]).optional().default("INBOUND"),
});
