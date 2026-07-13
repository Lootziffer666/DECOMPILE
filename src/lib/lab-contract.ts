export type LabConfidence = "verified" | "strongly-inferred" | "ambiguous" | "missing";

export interface LabBellowsGateway {
  gateway: "bellows";
  baseUrlEnv: string;
  apiKeyEnv: string;
  modelEnv: string;
  endpointPath?: "/v1/chat/completions";
  requiredForModelCalls?: true;
  messageContracts?: {
    text: "openai-compatible-string";
    vision: "openai-compatible-content-parts";
    partTypes: Array<"text" | "image_url">;
    imageUrlDetails?: Array<"auto" | "low" | "high">;
    imageTransports?: Array<"data-url" | "https-url">;
  };
  visionPayloadPolicy?: {
    buildInlineDataAtExecution: true;
    persistInlineImageData: false;
  };
}

export interface LabSourceFile {
  name: string;
  role: string;
  size: number;
  sha256: string;
  includedForAnalysis: boolean;
  exclusionReason?: string;
}

export interface LabExtractionRequest {
  schemaVersion: "1.0.0";
  module: "trivium-lab";
  jobId: string;
  action: "extract-legacy-evidence";
  aiGateway: LabBellowsGateway;
  source: {
    kind: "archive" | "binary" | "directory" | "image-set" | "video" | "capture";
    path: string;
    manifestPath?: string;
    formatHint?: string;
    ownershipConfirmed: true;
    provenance: string;
  };
  requestedEvidence: {
    assets?: boolean;
    behavior?: boolean;
    audio?: boolean;
  };
}

export interface LabObservation {
  id: string;
  kind: "asset" | "state" | "rule" | "timing" | "audio" | "rendering" | "interaction" | "unknown";
  evidence: string[];
  statement: string;
  confidence: LabConfidence;
  uncertainty?: string;
}

export interface LabEvidenceEnvelope {
  schemaVersion: "1.0.0";
  module: "trivium-lab";
  producer: "decompile";
  jobId: string;
  source: LabExtractionRequest["source"];
  sourceFiles?: LabSourceFile[];
  observations: LabObservation[];
  artifacts: Array<{ id: string; kind: string; path: string; hash?: string; license?: string }>;
  warnings: string[];
}

export function validateLabExtractionRequest(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["request object is required"];
  const request = value as Partial<LabExtractionRequest>;
  if (request.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0");
  if (request.module !== "trivium-lab") errors.push("module must be trivium-lab");
  if (!request.jobId?.trim()) errors.push("jobId is required");
  if (request.action !== "extract-legacy-evidence") errors.push("unsupported action");
  if (!request.source?.path?.trim()) errors.push("source.path is required");
  if (request.source?.manifestPath !== undefined && !request.source.manifestPath.trim()) errors.push("source.manifestPath must be non-empty");
  if (request.source?.formatHint !== undefined && !request.source.formatHint.trim()) errors.push("source.formatHint must be non-empty");
  if (request.source?.ownershipConfirmed !== true) errors.push("source ownership/authorization must be confirmed");
  if (!request.source?.provenance?.trim()) errors.push("source.provenance is required");
  if (request.aiGateway?.gateway !== "bellows") errors.push("aiGateway.gateway must be bellows");
  for (const field of ["baseUrlEnv", "apiKeyEnv", "modelEnv"] as const) {
    if (!request.aiGateway?.[field]?.trim()) errors.push(`aiGateway.${field} is required`);
  }
  const contracts = request.aiGateway?.messageContracts;
  if (contracts) {
    if (contracts.vision !== "openai-compatible-content-parts") {
      errors.push("aiGateway.messageContracts.vision must be openai-compatible-content-parts");
    }
    if (!contracts.partTypes?.includes("text") || !contracts.partTypes?.includes("image_url")) {
      errors.push("aiGateway.messageContracts.partTypes must include text and image_url");
    }
  }
  if (request.aiGateway?.visionPayloadPolicy?.persistInlineImageData !== undefined &&
      request.aiGateway.visionPayloadPolicy.persistInlineImageData !== false) {
    errors.push("aiGateway.visionPayloadPolicy.persistInlineImageData must be false");
  }
  return errors;
}

export function createLabEvidenceEnvelope(
  request: LabExtractionRequest,
  observations: LabObservation[],
  artifacts: LabEvidenceEnvelope["artifacts"] = [],
  warnings: string[] = [],
  sourceFiles: LabSourceFile[] = [],
): LabEvidenceEnvelope {
  const errors = validateLabExtractionRequest(request);
  if (errors.length) throw new Error(`Invalid LAB extraction request: ${errors.join("; ")}`);
  return {
    schemaVersion: "1.0.0",
    module: "trivium-lab",
    producer: "decompile",
    jobId: request.jobId,
    source: request.source,
    sourceFiles,
    observations,
    artifacts,
    warnings,
  };
}
