import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');

/**
 * Ensure a directory exists within the uploads folder
 */
export const ensureDirectoryExists = (subfolder: string = 'drafts'): string => {
  const dirPath = path.join(UPLOAD_ROOT, subfolder);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
};

/**
 * Save a base64 encoded image to disk and return its relative URL path
 */
export const saveBase64Image = async (
  base64String: string,
  prefix: string = 'image',
  subfolder: string = 'drafts'
): Promise<string> => {
  const targetDir = ensureDirectoryExists(subfolder);

  // Extract mime type and clean base64 data
  let mimeType = 'image/jpeg';
  let cleanBase64 = base64String;

  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    mimeType = matches[1];
    cleanBase64 = matches[2];
  }

  // Determine file extension
  let ext = 'jpg';
  if (mimeType.includes('png')) ext = 'png';
  else if (mimeType.includes('webp')) ext = 'webp';
  else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';

  const filename = `${prefix}_${uuidv4().substring(0, 8)}_${Date.now()}.${ext}`;
  const filePath = path.join(targetDir, filename);

  const buffer = Buffer.from(cleanBase64, 'base64');
  await fs.promises.writeFile(filePath, buffer);

  return `/uploads/${subfolder}/${filename}`;
};

/**
 * Save a binary buffer to disk and return its relative URL path
 */
export const saveBufferImage = async (
  buffer: Buffer,
  originalFilename: string = 'image.jpg',
  prefix: string = 'image',
  subfolder: string = 'drafts'
): Promise<string> => {
  const targetDir = ensureDirectoryExists(subfolder);
  const ext = path.extname(originalFilename).replace('.', '') || 'jpg';
  const filename = `${prefix}_${uuidv4().substring(0, 8)}_${Date.now()}.${ext}`;
  const filePath = path.join(targetDir, filename);

  await fs.promises.writeFile(filePath, buffer);
  return `/uploads/${subfolder}/${filename}`;
};

/**
 * Delete a file given its relative URL (e.g., /uploads/drafts/filename.jpg)
 */
export const deleteFile = async (relativeUrl: string): Promise<boolean> => {
  try {
    if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) {
      return false;
    }
    const relativePath = relativeUrl.replace('/uploads/', '');
    const absolutePath = path.join(UPLOAD_ROOT, relativePath);

    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete file ${relativeUrl}:`, error);
    return false;
  }
};
