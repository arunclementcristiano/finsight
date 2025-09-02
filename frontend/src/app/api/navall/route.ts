
import { promises as fs } from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';


export async function GET() {
  try {
    // Resolve the path to public/navall.txt
    const filePath = path.resolve(process.cwd(), 'public', 'navall.txt');
    const navAllData = await fs.readFile(filePath, 'utf-8');
    return new NextResponse(navAllData, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    return new NextResponse('NAVAll file not found or error reading file.', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}
