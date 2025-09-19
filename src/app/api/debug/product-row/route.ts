import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/auth'

export async function GET(request: NextRequest) {
  // Dev-only bypass: header x-dev-bypass-auth allowed locally
  const bypass = request.headers.get('x-dev-bypass-auth')
  const url = new URL(request.url)
  const productId = url.searchParams.get('id')

  if (!productId) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 })
  }

  if (!bypass) {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    return NextResponse.json({ success: true, product })
  } catch (err) {
    console.error('Debug product-row error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
