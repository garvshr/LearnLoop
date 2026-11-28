import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function ensureCloudinaryConfig() {
  if (!process.env.CLOUDINARY_URL) {
    dotenv.config({ path: path.resolve(__dirname, "../../.env") });
  }

  const rawUrl = process.env.CLOUDINARY_URL;
  if (rawUrl) {
    const parsed = new URL(rawUrl.trim());
    cloudinary.config({
      cloud_name: parsed.hostname,
      api_key: decodeURIComponent(parsed.username),
      api_secret: decodeURIComponent(parsed.password),
      secure: true,
    });
  }
}

ensureCloudinaryConfig();

/**
 * Uploads an in-memory file buffer (image, video, pdf, docx, etc.) to Cloudinary.
 * Uses resource_type: "auto" so Cloudinary handles images, videos, and raw docs.
 */
export function uploadBufferToCloudinary(fileBuffer, originalName = "file") {
  ensureCloudinaryConfig();

  return new Promise((resolve, reject) => {
    const safePublicName = originalName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "learnloop/proofs",
        resource_type: "auto",
        public_id: `${Date.now()}-${safePublicName}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );

    stream.end(fileBuffer);
  });
}

/**
 * Deletes a file from Cloudinary by its public_id and resource_type.
 */
export async function deleteFromCloudinary(publicId, resourceType = "image") {
  if (!publicId) return;
  ensureCloudinaryConfig();
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType || "image",
    });
  } catch (err) {
    console.warn("Cloudinary delete failed:", err.message);
  }
}
