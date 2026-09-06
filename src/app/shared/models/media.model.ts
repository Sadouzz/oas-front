export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
  resourceType: string; // 'image' | 'video' | 'raw'
  format: string;
  bytes: number;
}

export type MediaUploadEvent =
  | { status: 'progress'; progress: number }
  | { status: 'done'; result: CloudinaryUploadResult };

export interface MediaSignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string | null;
}

