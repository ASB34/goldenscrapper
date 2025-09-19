import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeCandidatesForOption, pickBestCandidate } from '@/lib/xau-repro';

export async function GET(request: NextRequest) {
  const devBypass = request.headers.get('x-dev-bypass-auth');
  if (process.env.NODE_ENV === 'production' || devBypass !== 'true') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get('id');
  const optionValue = request.nextUrl.searchParams.get('optionValue');

  if (!id) return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Normalize keys similarly to publish flow
    const normalized: any = {
      ...product,
      xauPricing: (product.xau_pricing ?? product.xauPricing) as any,
      originalTitle: product.original_title ?? product.originalTitle ?? product.title,
      specifications: product.specifications ?? product.specs
    };

    // Find option by value if provided, else take first option of first variant
    let option = null as any;
    if (optionValue && normalized.variants) {
      try {
        const variants = typeof normalized.variants === 'string' ? JSON.parse(normalized.variants) : normalized.variants;
        for (const v of variants) {
          for (const o of v.options || []) {
            if (String(o.value) === String(optionValue) || String(o.name) === String(optionValue)) {
              option = o; break;
            }
          }
          if (option) break;
        }
      } catch (e) {
        // continue
      }
    }

    if (!option) {
      try {
        const variants = typeof normalized.variants === 'string' ? JSON.parse(normalized.variants) : normalized.variants;
        if (variants && variants.length && variants[0].options && variants[0].options.length) {
          option = variants[0].options[0];
        }
      } catch (e) {}
    }

    if (!option) return NextResponse.json({ error: 'No option found to compute' }, { status: 400 });

    const rate = normalized.xauPricing?.rate || undefined;
    const productBasePrice = normalized.pricing ? (typeof normalized.pricing === 'string' ? JSON.parse(normalized.pricing).price : normalized.pricing.price) : undefined;
    const productBaseXau = normalized.xauPricing ? (normalized.xauPricing.price ? Number(normalized.xauPricing.price) : undefined) : undefined;

    const candidates = computeCandidatesForOption(option, normalized, rate, productBasePrice, productBaseXau);
    const best = pickBestCandidate(candidates as any);

    return NextResponse.json({ success: true, optionSnapshot: option, candidates, best });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
