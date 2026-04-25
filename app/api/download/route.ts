import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { tmpdir } from 'os';

const UPLOAD_DIR = join(tmpdir(), 'meet-uploads');

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
    }

    // Prevent directory traversal
    if (filename.includes('/') || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    const filePath = join(UPLOAD_DIR, filename);

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found or has expired' }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const contentType = getContentType(filename);

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // For general files, force download, for images/videos let browser try to show it inline
    if (contentType === 'application/octet-stream') {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
