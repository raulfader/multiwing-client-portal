import type { ToolDefinition } from "../tool";
import { approvalTools } from "./approvals";
import { clientRequestTools } from "./clientRequests";
import { deliverableTools } from "./deliverables";
import { fileTools } from "./files";
import { notificationTools } from "./notifications";
import { projectTools } from "./projects";
import { reviewTools } from "./reviews";
import { shareTools } from "./shares";
import { sonicBrandingTools } from "./sonicBranding";
import { systemTools } from "./system";

export const toolGroups: Record<string, ToolDefinition[]> = {
  "Session & system": systemTools,
  Projects: projectTools,
  "Deliverables": deliverableTools,
  "File transfer": fileTools,
  "Review comments & status": reviewTools,
  "Sonic-branding approvals": approvalTools,
  "Contacts & email notifications": notificationTools,
  "Guest / vendor shares": shareTools,
  "Client project requests": clientRequestTools,
  "Sonic branding": sonicBrandingTools,
};

export const allTools: ToolDefinition[] = Object.values(toolGroups).flat();
