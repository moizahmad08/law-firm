import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/client';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { number: string } }
) {
  try {
    const articleNumber = params.number.toUpperCase().trim();
    const article = await prisma.constitutionalArticle.findUnique({
      where: { articleNumber },
    });

    if (!article) {
      return NextResponse.json(
        { success: false, error: `Article ${articleNumber} not found in database` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      article,
    });
  } catch (err: any) {
    console.error('Failed to get article:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
