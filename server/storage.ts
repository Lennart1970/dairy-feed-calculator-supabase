// Storage helpers using Supabase Storage API directly
// Uses Supabase's native storage API with anon key authentication

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

const BUCKET_NAME = 'lab-reports';

function getStorageConfig(): StorageConfig {
  // Use dedicated Supabase variables, NOT the Forge/LLM variables
  const baseUrl = ENV.supabaseUrl;
  const apiKey = ENV.supabaseAnonKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Supabase storage credentials missing: set SUPABASE_URL and SUPABASE_ANON_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload a file to Supabase Storage
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Supabase Storage upload URL format:
  // POST {baseUrl}/storage/v1/object/{bucket}/{path}
  const uploadUrl = `${baseUrl}/storage/v1/object/${BUCKET_NAME}/${key}`;
  
  // Convert data to appropriate format
  let body: BodyInit;
  if (typeof data === "string") {
    body = data;
  } else {
    body = data;
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "apikey": apiKey,
      "Content-Type": contentType,
      "x-upsert": "true"  // Allow overwriting existing files
    },
    body: body,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }

  // Construct the public URL for the uploaded file
  // Supabase public URL format: {baseUrl}/storage/v1/object/public/{bucket}/{path}
  const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
  
  return { key, url: publicUrl };
}

/**
 * Get a download URL for a file in Supabase Storage
 */
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl } = getStorageConfig();
  const key = normalizeKey(relKey);
  
  // Supabase public URL format
  const publicUrl = `${baseUrl}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
  
  return { key, url: publicUrl };
}
