import { NextRequest, NextResponse } from 'next/server';

// Simple test endpoint for security tests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint response',
      timestamp: new Date().toISOString(),
      receivedData: body,
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid JSON' 
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Test endpoint is working',
    timestamp: new Date().toISOString(),
  });
}