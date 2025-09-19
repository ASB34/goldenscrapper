// Utilities to reproduce frontend XAU calculations on the server
// Returns multiple candidate XAU values with source names for debugging/verification
export function computeWeightPurityXau(grams: number | string | null | undefined, purityFraction: number | null | undefined) {
  try {
    if (!grams || !purityFraction) return null;
    const g = typeof grams === 'string' ? parseFloat(grams) : Number(grams);
    if (isNaN(g) || g <= 0) return null;
    if (typeof purityFraction !== 'number' || isNaN(purityFraction) || purityFraction <= 0) return null;
    const gramsPerTroyOunce = 31.1034768;
    const xau = (g * purityFraction) / gramsPerTroyOunce;
    return Number(xau.toFixed(6));
  } catch (e) {
    return null;
  }
}

export function computeCandidatesForOption(option: any, productContext: any = {}, ratePerOz?: number, productBasePrice?: number, productBaseXau?: number) {
  const candidates: Array<{ source: string; value: number | null; info?: any }> = [];

  // 1) persisted variantPricing.xau
  try {
    if (option && option.variantPricing) {
      const vp = typeof option.variantPricing === 'string' ? JSON.parse(option.variantPricing) : option.variantPricing;
      if (vp && vp.xau !== undefined && vp.xau !== null && !isNaN(Number(vp.xau))) {
        candidates.push({ source: 'option.variantPricing.xau', value: Number(vp.xau), info: { raw: vp.xau } });
      }
    }
  } catch (e) {
    // ignore
  }

  // 2) direct fields: xau, xauPrice, xau_price
  try {
    if (option && option.xau && !isNaN(Number(option.xau))) {
      candidates.push({ source: 'option.xau', value: Number(option.xau) });
    }
    if (option && option.xauPrice && !isNaN(Number(option.xauPrice))) {
      candidates.push({ source: 'option.xauPrice', value: Number(option.xauPrice) });
    }
    if (option && option.xau_price && !isNaN(Number(option.xau_price))) {
      candidates.push({ source: 'option.xau_price', value: Number(option.xau_price) });
    }
  } catch (e) {}

  // 3) option.pricing.xau or pricing.xauPrice
  try {
    if (option && option.pricing) {
      const p = typeof option.pricing === 'string' ? JSON.parse(option.pricing) : option.pricing;
      if (p && p.xau && !isNaN(Number(p.xau))) candidates.push({ source: 'option.pricing.xau', value: Number(p.xau) });
      if (p && p.xauPrice && !isNaN(Number(p.xauPrice))) candidates.push({ source: 'option.pricing.xauPrice', value: Number(p.xauPrice) });
    }
  } catch (e) {}

  // 4) proportional conversion using productBasePrice -> productBaseXau (if provided)
  try {
    if ((productBasePrice || productBasePrice === 0) && (productBaseXau || productBaseXau === 0) && option && option.price) {
      const rawPrice = parseFloat(option.price);
      if (!isNaN(rawPrice) && productBasePrice > 0) {
        const proportional = productBaseXau * (rawPrice / productBasePrice);
        candidates.push({ source: 'proportional', value: Number(proportional.toFixed(6)), info: { rawPrice } });
      }
    }
  } catch (e) {}

  // 5) convert currency price to XAU using ratePerOz
  try {
    if (ratePerOz && option && option.price) {
      const rawPrice = parseFloat(option.price);
      if (!isNaN(rawPrice) && ratePerOz > 0) {
        const converted = rawPrice / ratePerOz;
        candidates.push({ source: 'ratePerOz', value: Number(converted.toFixed(6)), info: { rawPrice, ratePerOz } });
      }
    }
  } catch (e) {}

  // 6) weight + purity fallback (option.weight or productContext.specifications.weight)
  try {
    let grams = null;
    if (option && option.weight) grams = option.weight;
    if (!grams && productContext && (productContext.specifications || productContext.specs)) {
      const specs = productContext.specifications || productContext.specs;
      if (specs && specs.weight) grams = specs.weight;
    }

    // detect purity fraction (karat or purity value)
    let purityFraction = null;
    // detect karat from title first
    if (productContext && (productContext.originalTitle || productContext.title)) {
      const title = (productContext.originalTitle || productContext.title).toString();
      const karatMatch = title.match(/(\b(\d{2})\s?K\b|\b(\d{2})\s?Ayar\b)/i);
      if (karatMatch) {
        const karat = parseInt((karatMatch[2] || karatMatch[3]) as any, 10);
        if (!isNaN(karat) && karat > 0) purityFraction = karat / 24;
      }
    }

    if (!purityFraction && productContext && productContext.specifications) {
      const specs = productContext.specifications;
      if (specs.purity) {
        const p = parseFloat(specs.purity.toString());
        if (!isNaN(p) && p > 0 && p <= 24) purityFraction = p / 24;
      }
    }

    if (grams && !purityFraction && productContext && productContext.specifications && productContext.specifications.karat) {
      const k = parseFloat(productContext.specifications.karat);
      if (!isNaN(k) && k > 0) purityFraction = k / 24;
    }

    if (grams && purityFraction) {
      const wp = computeWeightPurityXau(grams, purityFraction);
      if (wp !== null) candidates.push({ source: 'weight_purity', value: wp, info: { grams, purityFraction } });
    }
  } catch (e) {}

  // 7) very small fallback (legacy)
  try {
    if (option && option.price && (!candidates.length)) {
      const rawPrice = parseFloat(option.price);
      if (!isNaN(rawPrice)) {
        const fallback = Number((rawPrice * 0.000001).toFixed(6));
        candidates.push({ source: 'legacy_fallback', value: fallback, info: { rawPrice } });
      }
    }
  } catch (e) {}

  // Normalize candidates: remove duplicates by identical value+source ordering preserved
  const seen = new Set<string>();
  const normalized = [] as any[];
  for (const c of candidates) {
    const key = `${c.source}:${c.value}`;
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(c);
    }
  }

  return normalized;
}

export function pickBestCandidate(candidates: Array<{ source: string; value: number | null }>) {
  // Heuristic: prefer persisted values, then weight_purity, then proportional, then ratePerOz, then direct option fields, then fallback
  const priority = ['option.variantPricing.xau', 'option.xau', 'option.xauPrice', 'option.xau_price', 'option.pricing.xau', 'option.pricing.xauPrice', 'weight_purity', 'proportional', 'ratePerOz', 'legacy_fallback'];
  for (const p of priority) {
    const found = candidates.find(c => c.source === p && c.value !== null && !isNaN(Number(c.value)) && Number(c.value) > 0);
    if (found) return { source: found.source, value: Number(found.value).toFixed(6) };
  }
  // if none match, return first numeric candidate
  const fallback = candidates.find(c => c.value !== null && !isNaN(Number(c.value)));
  if (fallback) return { source: fallback.source, value: Number(fallback.value).toFixed(6) };
  return { source: 'none', value: null };
}
