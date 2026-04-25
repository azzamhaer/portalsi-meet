import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

const UPLOAD_DIR = join(tmpdir(), 'meet-uploads');
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

// Background cleanup function
async function cleanupOldFiles() {
  try {
    if (!existsSync(UPLOAD_DIR)) return;
    const files = await readdir(UPLOAD_DIR);
    const now = Date.now();
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = join(UPLOAD_DIR, file);
      const fileStat = await stat(filePath);
      if (now - fileStat.mtimeMs > MAX_AGE_MS) {
        await unlink(filePath).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Fire and forget cleanup
    cleanupOldFiles();

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file found' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const originalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_'); // sanitize
    const filename = `${uniqueSuffix}-${originalName}`;
    const filePath = join(UPLOAD_DIR, filename);

    // Ensure directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    await writeFile(filePath, buffer);

    const fileUrl = `/api/download?file=${filename}`;

    return NextResponse.json({ success: true, url: fileUrl, name: originalName });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
