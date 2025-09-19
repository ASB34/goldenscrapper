import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import axios from 'axios';

const AI_REWRITE_PROMPT = `Sen bir e-ticaret içerik uzmanısın. Sana Etsy'den çekilmiş ürün verisi vereceğim: başlık, açıklama, keywordler.

İstenen kalite:
- Başlıklar kısa, SEO odaklı ve anlamlı olmalı (özgün ve açıklayıcı).
- Açıklamalar ürünün özelliklerini, kullanımını ve albenisini vurgulamalı; akıcı ve doğal dil kullanılmalı.
- Çıktı aşağıdaki JSON formatında olmalı (yalnızca JSON, ekstra metin yok):

{
  "en": { "title": "...", "description": "...", "keywords": ["..."] },
  "tr": { "title": "...", "description": "...", "keywords": ["..."] },
  "it": { "title": "...", "description": "...", "keywords": ["..."] },
  "ar": { "title": "...", "description": "...", "keywords": ["..."] }
}

Not: Eğer JSON dışında veya kurallara uymayan bir çıktı üretirseniz, sadece JSON'u yeniden gönderin.`;

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { productId } = await request.json();

    // Get product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get AI settings
    const settings = await prisma.apiKeys.findFirst();
    if (!settings) {
      return NextResponse.json({ error: 'AI settings not configured' }, { status: 400 });
    }

    // Default to 'openai' when the user hasn't explicitly set a provider
    let aiProvider = settings.aiProvider ?? 'openai';
    let apiKey = '';

    console.log('🔧 AI provider from settings:', aiProvider);

    // Prefer a DB-stored OpenAI key if present (even when aiProvider is undefined/missing)
    if (settings.openaiApiKey) {
      try {
        apiKey = decrypt(settings.openaiApiKey);
        aiProvider = 'openai';
        console.log('🔑 Using OpenAI key from DB settings');
      } catch (e) {
        console.warn('⚠️ Failed to decrypt OpenAI key from DB settings:', e);
      }
    }

    // If no DB key, allow environment fallback for local testing
    if (!apiKey && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY as string;
      aiProvider = 'openai';
      console.warn('⚠️ Using OPENAI_API_KEY from environment for local testing');
    }

    // If provider explicitly set to zai, check zai key
    if (aiProvider === 'zai') {
      if (settings.zaiApiKey) {
        try {
          apiKey = decrypt(settings.zaiApiKey);
          console.log('🔑 Using Z.ai key from DB settings');
        } catch (e) {
          console.warn('⚠️ Failed to decrypt Z.ai key from DB settings:', e);
        }
      } else {
        console.warn('❌ Z.ai API key not configured in DB');
      }
    }

    // Prepare product data for AI
    // Normalize snake_case DB fields to expected camelCase shape
    const productTitle = product.originalTitle ?? product.original_title ?? product.title ?? '';
    const productDescription = product.originalDescription ?? product.original_description ?? product.description ?? '';
    let productKeywords = product.originalKeywords ?? product.original_keywords ?? product.keywords ?? [];
    // Ensure keywords is an array
    if (typeof productKeywords === 'string') {
      try {
        productKeywords = JSON.parse(productKeywords);
      } catch {
        productKeywords = productKeywords.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const productData = {
      title: productTitle,
      description: productDescription,
      keywords: productKeywords
    };

    // Defensive: require at least a title or description for AI rewrite
    if (!productData.title && !productData.description) {
      console.error('AI rewrite aborted: product missing title and description', { productId, product });
      return NextResponse.json({ error: 'Product missing title and description for AI rewrite' }, { status: 400 });
    }

  let userPrompt = `Ürün Verisi:
Başlık: ${productData.title}
Açıklama: ${productData.description}
Keywordler: ${JSON.stringify(productData.keywords)}

Lütfen yukarıdaki kesin kurallara göre (başlık ≤5 kelime, açıklama ≥150 kelime her dilde) çok-dilli içerik üretin ve yalnızca JSON olarak yanıtlayın.`;

    let aiResponse;

    if (aiProvider === 'openai' && apiKey) {
      // Try to get a valid response from OpenAI with retries
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;
      while (attempt <= maxRetries) {
        try {
          console.log(`🔎 OpenAI attempt ${attempt + 1}/${maxRetries + 1} for product ${productId}`);
          aiResponse = await callOpenAI(apiKey, userPrompt);
          console.log('🔎 Raw OpenAI assistant text received (parsed to JSON)');
          const validation = validateAiResponse(aiResponse);
          if (validation.valid) {
            console.log('✅ OpenAI response passed validation');
            break;
          }
          console.warn('⚠️ OpenAI response failed validation:', validation.issues);
          // If invalid, build a targeted follow-up prompt listing exactly which fields to fix
          const issuesText = validation.issues.join('; ');
          // Build a short actionable instruction for the model
          const fixes: string[] = [];
          for (const issue of validation.issues) {
            const parts = issue.split(' ');
            const lang = parts[0];
            if (issue.includes('title empty')) {
              fixes.push(`Create a concise, SEO-friendly title for ${lang} based on the product data.`);
            } else if (issue.includes('description empty')) {
              fixes.push(`Provide a descriptive paragraph for ${lang} describing the product's features and use.`);
            } else if (issue.includes('missing')) {
              fixes.push(`Add the missing section for ${lang} including title, description, and keywords.`);
            }
          }

          // Ask the model to ONLY return the corrected JSON; include the original JSON as context
          const followUp = `The previous JSON missed or had empty fields: ${issuesText}. ${fixes.join(' ')}\n\nRespond ONLY with the corrected JSON object in the exact schema we previously provided (no extra text, no explanation).`;

          // Use the follow-up as the next user prompt so the assistant can correct only the failing parts
          userPrompt = followUp + '\n\nOriginal JSON for reference:\n' + JSON.stringify(aiResponse);
          attempt++;
          lastError = new Error('Validation failed: ' + issuesText);
        } catch (err) {
          const e: any = err;
          console.error('OpenAI call error on attempt', attempt + 1, e?.response?.data || e);
          lastError = e;
          attempt++;
        }
      }

      if (!aiResponse || !validateAiResponse(aiResponse).valid) {
        console.warn('OpenAI failed or returned invalid output repeatedly, falling back to mock. Last error:', lastError);
        aiResponse = await mockZaiResponse(productData);
      }
    } else {
      console.warn('Using mock AI response because OpenAI is not configured or no API key available.');
      aiResponse = await mockZaiResponse(productData);
    }

    // Update product with AI rewritten content
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        aiRewrittenContent: aiResponse,
        isProcessed: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      rewrittenContent: aiResponse 
    });
  } catch (error) {
    console.error('AI rewrite error:', error);
    return NextResponse.json({ error: 'AI rewrite failed' }, { status: 500 });
  }
}

async function callOpenAI(apiKey: string, prompt: string) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: AI_REWRITE_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 3000
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiText = response.data.choices[0].message.content;
    // Try extracting JSON from code fence or the whole assistant text
    const cleaned = extractJson(aiText);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('OpenAI API call failed');
  }
}

function extractJson(aiText: string) {
  // Prefer ```json blocks
  const jsonFence = /```json\s*([\s\S]*?)\s*```/i.exec(aiText);
  if (jsonFence && jsonFence[1]) return jsonFence[1].trim();

  // Fallback: try to find the first { and the last } and take that substring
  const first = aiText.indexOf('{');
  const last = aiText.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return aiText.substring(first, last + 1);
  }
  // If nothing works, return the raw text (will likely throw on parse)
  return aiText;
}

function validateAiResponse(obj: any) {
  const issues: string[] = [];
  if (!obj || typeof obj !== 'object') {
    issues.push('Response is not an object');
    return { valid: false, issues };
  }
  // Relaxed checks: ensure each language exists and has non-empty title & description
  const langs = ['en', 'tr', 'it', 'ar'];
  for (const l of langs) {
    const entry = obj[l];
    if (!entry || typeof entry !== 'object') {
      issues.push(`${l} missing`);
      continue;
    }
    const title = String(entry.title || '').trim();
    const desc = String(entry.description || '').trim();
    if (!title) issues.push(`${l} title empty`);
    if (!desc) issues.push(`${l} description empty`);
  }
  return { valid: issues.length === 0, issues };
}

async function mockZaiResponse(productData: any) {
  // Basic rule-based multilingual mock response.
  // This improves on the previous very-English output by doing lightweight
  // phrase/keyword replacements per language. It's still a mock and should be
  // replaced by a real AI provider in production.
  const safeTitle = (productData.title || 'Artisan Item').toString();
  const safeDescription = (productData.description || '').toString();

  const shortTitleWords = safeTitle.split(/\s+/).slice(0, 6).join(' ');
  const shortDesc150 = safeDescription.length > 150 ? safeDescription.substring(0, 150) : safeDescription;

  // Small translation dictionaries for common words/phrases we see in product data.
  const dicts: Record<string, Record<string, string>> = {
    tr: {
      'Premium': 'Premium',
      'High-quality': 'Yüksek kaliteli',
      'High quality': 'Yüksek kaliteli',
      'Elevate your style': 'Tarzınızı yükseltin',
      'jewelry': 'takı',
      'bracelet': 'bilezik',
      'gold': 'altın',
      'link': 'halka',
      'unisex': 'unisex',
      'handmade': 'el yapımı',
      'unique': 'benzersiz',
      'gift': 'hediye'
    },
    it: {
      'Premium': 'Premium',
      'High-quality': 'Alta qualità',
      'High quality': 'Alta qualità',
      'Elevate your style': 'Eleva il tuo stile',
      'jewelry': 'gioielleria',
      'bracelet': 'bracciale',
      'gold': 'oro',
      'link': 'maglia',
      'unisex': 'unisex',
      'handmade': 'fatto a mano',
      'unique': 'unico',
      'gift': 'regalo'
    },
    ar: {
      'Premium': 'ممتاز',
      'High-quality': 'جودة عالية',
      'High quality': 'جودة عالية',
      'Elevate your style': 'ارتق بمظهرك',
      'jewelry': 'مجوهرات',
      'bracelet': 'سوار',
      'gold': 'ذهب',
      'link': 'رابط',
      'unisex': 'غير محدد الجنس',
      'handmade': 'مصنوع يدويًا',
      'unique': 'فريد',
      'gift': 'هدية'
    }
  };

  function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function translate(text: string, lang: string) {
    if (!text) return text;
    const map = dicts[lang];
    if (!map) return text;
    let out = text;
    // Normalize whitespace
    out = out.replace(/\s+/g, ' ').trim();
    // Replace longer phrases first to avoid partial matches
    const keys = Object.keys(map).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const v = map[k];
      out = out.replace(new RegExp('\\b' + escapeRegex(k) + '\\b', 'gi'), v);
    }
    // Remove stray leading English sentence starts like 'This', 'The' if still present
    out = out.replace(/^\b(This|The|A|An)\b\s*/i, '');
    return out.trim();
  }

  // Generate language-specific keywords (simple mapped list)
  function keywordsFor(lang: string) {
    switch (lang) {
      case 'tr':
        return ['premium', 'kaliteli', 'el yapımı', 'benzersiz', 'hediye'];
      case 'it':
        return ['premium', 'qualità', 'fatto a mano', 'unico', 'regalo'];
      case 'ar':
        return ['ممتاز', 'جودة', 'صنع يدوي', 'فريد', 'هدية'];
      default:
        return ['premium', 'quality', 'handmade', 'unique', 'gift'];
    }
  }

  // Instead of translating long running original descriptions (which produced
  // mixed-language remnants), generate short template-based descriptions per
  // language. Detect whether the original mentions contact/length and include
  // a short note if so.
  const mentionsContactOrLength = /contact|length|lengths|please contact|please contact us/i.test(safeDescription);

  function buildTemplateDescription(lang: string) {
    const shortTitle = translate(shortTitleWords, lang);
    switch (lang) {
      case 'tr': {
        const base = `${shortTitle} zamansız ve şık bir parçadır, gündelik veya özel kullanımlarda rahatlıkla tercih edilebilir.`;
        return mentionsContactOrLength ? `${base} Uzunluk için lütfen bizimle iletişime geçin.` : base;
      }
      case 'it': {
        const base = `${shortTitle} è un pezzo senza tempo ed elegante, perfetto per occasioni casual e formali.`;
        return mentionsContactOrLength ? `${base} Contattaci per lunghezze personalizzate.` : base;
      }
      case 'ar': {
        const base = `${shortTitle} قطعة خالدة وأنيقة، مثالية للارتداء اليومي والمناسبات الرسمية.`;
        return mentionsContactOrLength ? `${base} يرجى الاتصال بنا لأطوال مخصصة.` : base;
      }
      default: {
        const base = `${shortTitle} is a timeless and elegant piece, perfect for casual and formal occasions.`;
        return mentionsContactOrLength ? `${base} Please contact us for custom lengths.` : base;
      }
    }
  }

  const enOut = {
    title: `Premium ${shortTitleWords}`,
    description: buildTemplateDescription('en'),
    keywords: keywordsFor('en')
  };

  const trOut = {
    title: `${translate('Premium', 'tr')} ${translate(shortTitleWords, 'tr')}`.trim(),
    description: buildTemplateDescription('tr'),
    keywords: keywordsFor('tr')
  };

  const itOut = {
    title: `${translate('Premium', 'it')} ${translate(shortTitleWords, 'it')}`.trim(),
    description: buildTemplateDescription('it'),
    keywords: keywordsFor('it')
  };

  const arOut = {
    title: `${translate(shortTitleWords, 'ar')} - عربي`,
    description: buildTemplateDescription('ar'),
    keywords: keywordsFor('ar')
  };

  return { en: enOut, tr: trOut, it: itOut, ar: arOut };
}
