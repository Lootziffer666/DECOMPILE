export type LabConfidence = "verified" | "strongly-inferred" | "ambiguous" | "missing";

export interface LabExtractionRequest {
  schemaVersion: "1.0.0";
  module: "trivium-lab";
  jobId: string;
  action: "extract-legacy-evidence";
  source: {
    kind: "archive" | "binary" | "directory" | "image-set" | "video" | "capture";
    path: string;
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
  if (request.source?.ownershipConfirmed !== true) errors.push("source ownership/authorization must be confirmed");
  if (!request.source?.provenance?.trim()) errors.push("source.provenance is required");
  return errors;
}

export function createLabEvidenceEnvelope(
  request: LabExtractionRequest,
  observations: LabObservation[],
  artifacts: LabEvidenceEnvelope["artifacts"] = [],
  warnings: string[] = [],
): LabEvidenceEnvelope {
  const errors = validateLabExtractionRequest(request);
  if (errors.length) throw new Error(`Invalid LAB extraction request: ${errors.join("; ")}`);
  return {
    schemaVersion: "1.0.0",
    module: "trivium-lab",
    producer: "decompile",
    jobId: request.jobId,
    source: request.source,
    observations,
    artifacts,
    warnings,
  };
}
