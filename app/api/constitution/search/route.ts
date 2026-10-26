import { NextRequest, NextResponse } from 'next/server';
import { searchConstitutionalArticles, searchStatutoryRules } from '@/lib/constitution/retrieval';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') || 'all'; // 'all' | 'articles' | 'rules'

    let articles: any[] = [];
    let rules: any[] = [];

    if (type === 'all' || type === 'articles') {
      articles = await searchConstitutionalArticles(query, limit);
    }

    if (type === 'all' || type === 'rules') {
      rules = await searchStatutoryRules(query, limit);
    }

    return NextResponse.json({
      success: true,
      query,
      articles,
      rules,
      totalCount: articles.length + rules.length,
    });
  } catch (err: any) {
    console.error('Failed to search constitution database:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
