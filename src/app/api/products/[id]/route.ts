import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

  // Debug: log raw DB row to inspect returned fields
  console.log('🔎 Raw product row from DB:', product);

  // Normalize snake_case DB row into camelCase for client
    const normalizeProductRow = (row: any) => ({
      id: row.id,
      etsyId: row.etsy_id ?? row.etsyId,
      originalTitle: row.original_title ?? row.originalTitle ?? row.title ?? '',
      originalDescription: row.original_description ?? row.originalDescription ?? row.description ?? '',
      originalKeywords: row.original_keywords ?? row.originalKeywords ?? row.keywords ?? [],
      originalImages: row.original_images ?? row.originalImages ?? row.images ?? [],
      originalVideos: row.original_videos ?? row.originalVideos ?? row.videos ?? [],
      aiRewrittenContent: row.ai_rewritten_content ?? row.aiRewrittenContent ?? {},
      isProcessed: row.is_processed ?? row.isProcessed ?? false,
      isPublished: row.is_published ?? row.isPublished ?? false,
      publishedTo: row.published_to ?? row.publishedTo ?? {},
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
      pricing: row.pricing ?? row.pricing,
      specifications: row.specifications ?? row.specifications,
      variants: row.variants ?? row.variants,
      category: row.category,
      vendor: row.vendor,
      sku: row.sku,
      sourceUrl: row.source_url ?? row.sourceUrl
    });

    const normalized = normalizeProductRow(product);
    return NextResponse.json({ product: normalized });
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: resolvedParams.id }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
