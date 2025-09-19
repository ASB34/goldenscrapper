'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Wand2, Send, Eye, ShoppingCart, Image, DollarSign, Coins, Edit, Save } from 'lucide-react'

interface XauRate {
  id: string;
  currency: string;
  rate: number;
  ratePerOz: number;
  updatedAt: string;
}

interface Product {
  id: string;
  originalTitle: string;
  originalDescription: string;
  originalKeywords: any;
  originalImages?: any;
  originalVideos?: any;
  pricing?: any;
  xauPricing?: any;
  specifications?: any;
  variants?: any;
  category?: string;
  vendor?: string;
  sourceUrl?: string;
  aiRewrittenContent?: any;
  isProcessed: boolean;
  isPublished: boolean;
  publishedTo?: any;
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [rewriting, setRewriting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
  const [xauRates, setXauRates] = useState<XauRate[]>([])
  const [xauLoading, setXauLoading] = useState(false)
  const [editingPrices, setEditingPrices] = useState(false)
  const [priceValues, setPriceValues] = useState({
    price: '',
    comparePrice: '',
    minPrice: '',
    maxPrice: '',
    currency: 'USD'
  })

  useEffect(() => {
    fetchProduct()
    fetchXauRates()
  }, [params.id])

  const fetchXauRates = async () => {
    try {
      setXauLoading(true)
      const response = await fetch('/api/xau-rates?refresh=true')
      if (response.ok) {
        const data = await response.json()
        setXauRates(data.rates || [])
      }
    } catch (error) {
      console.error('Error fetching XAU rates:', error)
    } finally {
      setXauLoading(false)
    }
  }

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProduct(data.product)
        
        // Initialize price values
        const pricing = parseJsonSafely(data.product.pricing)
        if (pricing) {
          setPriceValues({
            price: pricing.price || '',
            comparePrice: pricing.comparePrice || '',
            minPrice: pricing.minPrice || '',
            maxPrice: pricing.maxPrice || '',
            currency: pricing.currency || 'USD'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error)
    } finally {
      setLoading(false)
    }
  }

  // Currency detection function
  const detectCurrency = (priceString: string): string => {
    if (!priceString) return 'USD'
    
    // Common currency patterns
    const patterns = [
      { regex: /₺|\btry\b|turkish|lira/i, currency: 'TRY' },
      { regex: /\$|usd|dollar/i, currency: 'USD' },
      { regex: /€|eur|euro/i, currency: 'EUR' },
      { regex: /£|gbp|pound/i, currency: 'GBP' }
    ]
    
    for (const pattern of patterns) {
      if (pattern.regex.test(priceString)) {
        return pattern.currency
      }
    }
    
    return 'USD' // Default
  }

  // XAU Conversion Functions
  const getXauRate = (currency: string): number => {
    const rate = xauRates.find(r => r.currency === currency)
    return rate ? rate.ratePerOz : 0 // Use troy ounce rate
  }

  const convertToXau = (price: number, currency: string): number => {
    const rate = getXauRate(currency)
    if (!rate) return 0
    return price / rate // Price divided by rate per ounce = troy ounces
  }

  const convertFromXau = (xauAmount: number, currency: string): number => {
    const rate = getXauRate(currency)
    if (!rate) return 0
    return xauAmount * rate
  }

  const formatXauPrice = (xauAmount: number): string => {
    return `${xauAmount.toFixed(6)} XAU (oz)`
  }

  const formatCurrency = (amount: number | string, currency: string): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(num)) return 'N/A'
    
    const symbols = { USD: '$', EUR: '€', GBP: '£', TRY: '₺' }
    const symbol = symbols[currency as keyof typeof symbols] || currency
    return `${symbol}${num.toFixed(2)}`
  }

  const handleRewrite = async () => {
    if (!product) return
    
    setRewriting(true)
    try {
      const response = await fetch(`/api/products/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id })
      })
      
      if (response.ok) {
        await fetchProduct()
      }
    } catch (error) {
      console.error('Error rewriting content:', error)
    } finally {
      setRewriting(false)
    }
  }

  const handlePublish = async () => {
    if (!product || selectedPlatforms.length === 0) return
    
    setPublishing(true)
    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          platforms: selectedPlatforms
        })
      })
      
      if (response.ok) {
        await fetchProduct()
      }
    } catch (error) {
      console.error('Error publishing product:', error)
    } finally {
      setPublishing(false)
    }
  }

  const handleSavePrices = async () => {
    if (!product) return
    
    try {
      const response = await fetch(`/api/products/${product.id}/pricing`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(priceValues)
      })
      
      if (response.ok) {
        await fetchProduct()
        setEditingPrices(false)
      }
    } catch (error) {
      console.error('Error updating prices:', error)
    }
  }

  const parseJsonSafely = (jsonString: any) => {
    if (!jsonString) return null
    if (typeof jsonString === 'object') return jsonString
    try {
      return JSON.parse(jsonString)
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h1>
          <Button onClick={() => router.push('/products')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    )
  }

  const images = parseJsonSafely(product.originalImages) || []
  const keywords = parseJsonSafely(product.originalKeywords) || []
  const pricing = parseJsonSafely(product.pricing)
  const xauPricing = parseJsonSafely(product.xauPricing)
  const specifications = parseJsonSafely(product.specifications)
  const variants = parseJsonSafely(product.variants) || []
  const aiContent = parseJsonSafely(product.aiRewrittenContent)
  const publishedTo = parseJsonSafely(product.publishedTo) || {}

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/products')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.originalTitle}</h1>
            <p className="text-gray-500 mt-1">
              {product.vendor} • {product.category} • {new Date(product.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {product.isProcessed && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Wand2 className="w-3 h-3 mr-1" />
              AI Processed
            </Badge>
          )}
          {product.isPublished && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Send className="w-3 h-3 mr-1" />
              Published
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Images & Pricing */}
        <div className="space-y-6">
          {/* Images Gallery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="w-5 h-5 mr-2" />
                Product Images ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {images.slice(0, 6).map((img: string, idx: number) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Product ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg border hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ))}
                  {images.length > 6 && (
                    <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg border">
                      <span className="text-sm text-gray-500">+{images.length - 6} more</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No images found</p>
              )}
            </CardContent>
          </Card>

          {/* Unified Pricing Display */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Multi-Currency Pricing
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPrices(!editingPrices)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {editingPrices ? 'Cancel' : 'Edit'}
                </Button>
              </div>
              <CardDescription>
                View prices in original currency, USD, and Gold (XAU)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pricing ? (
                <>
                  {/* Current Price */}
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <h4 className="font-semibold text-blue-800 mb-3">💰 Current Price</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Original ({pricing.currency})</p>
                        {editingPrices ? (
                          <input
                            type="number"
                            value={priceValues.price}
                            onChange={(e) => setPriceValues({...priceValues, price: e.target.value})}
                            className="w-full p-2 border rounded text-center font-bold"
                            step="0.01"
                          />
                        ) : (
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(pricing.price, pricing.currency)}
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">USD Equivalent</p>
                        <p className="text-lg font-bold text-green-700">
                          {pricing.currency === 'USD' ? 
                            formatCurrency(pricing.price, 'USD') : 
                            formatCurrency(convertFromXau(convertToXau(parseFloat(pricing.price || '0'), pricing.currency), 'USD'), 'USD')
                          }
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-600 mb-1">Gold (XAU)</p>
                        <p className="text-lg font-bold text-amber-700">
                          {xauPricing?.price ? 
                            `${xauPricing.price.toFixed(6)} oz` : 
                            formatXauPrice(convertToXau(parseFloat(pricing.price || '0'), pricing.currency))
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Compare Price (if exists) */}
                  {(pricing.comparePrice || priceValues.comparePrice) && (
                    <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                      <h4 className="font-semibold text-red-800 mb-3">💸 Compare Price (Was)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Original ({pricing.currency})</p>
                          {editingPrices ? (
                            <input
                              type="number"
                              value={priceValues.comparePrice}
                              onChange={(e) => setPriceValues({...priceValues, comparePrice: e.target.value})}
                              className="w-full p-2 border rounded text-center line-through"
                              step="0.01"
                            />
                          ) : (
                            <p className="text-lg line-through text-red-700">
                              {formatCurrency(pricing.comparePrice, pricing.currency)}
                            </p>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">USD Equivalent</p>
                          <p className="text-lg line-through text-red-700">
                            {pricing.currency === 'USD' ? 
                              formatCurrency(pricing.comparePrice, 'USD') : 
                              formatCurrency(convertFromXau(convertToXau(parseFloat(pricing.comparePrice || '0'), pricing.currency), 'USD'), 'USD')
                            }
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-600 mb-1">Gold (XAU)</p>
                          <p className="text-lg line-through text-red-700">
                            {xauPricing?.comparePrice ? 
                              `${xauPricing.comparePrice.toFixed(6)} oz` : 
                              formatXauPrice(convertToXau(parseFloat(pricing.comparePrice || '0'), pricing.currency))
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Range (if exists) */}
                  {(pricing.minPrice && pricing.maxPrice) && (
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                      <h4 className="font-semibold text-purple-800 mb-3">📊 Price Range (Variants)</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">Min Price ({pricing.currency})</p>
                            {editingPrices ? (
                              <input
                                type="number"
                                value={priceValues.minPrice}
                                onChange={(e) => setPriceValues({...priceValues, minPrice: e.target.value})}
                                className="w-full p-2 border rounded text-center"
                                step="0.01"
                              />
                            ) : (
                              <p className="font-bold text-purple-700">
                                {formatCurrency(pricing.minPrice, pricing.currency)}
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">USD</p>
                            <p className="font-bold text-purple-700">
                              {formatCurrency(convertFromXau(convertToXau(parseFloat(pricing.minPrice || '0'), pricing.currency), 'USD'), 'USD')}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">XAU</p>
                            <p className="font-bold text-purple-700">
                              {formatXauPrice(convertToXau(parseFloat(pricing.minPrice || '0'), pricing.currency))}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">Max Price ({pricing.currency})</p>
                            {editingPrices ? (
                              <input
                                type="number"
                                value={priceValues.maxPrice}
                                onChange={(e) => setPriceValues({...priceValues, maxPrice: e.target.value})}
                                className="w-full p-2 border rounded text-center"
                                step="0.01"
                              />
                            ) : (
                              <p className="font-bold text-purple-700">
                                {formatCurrency(pricing.maxPrice, pricing.currency)}
                              </p>
                            )}
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">USD</p>
                            <p className="font-bold text-purple-700">
                              {formatCurrency(convertFromXau(convertToXau(parseFloat(pricing.maxPrice || '0'), pricing.currency), 'USD'), 'USD')}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-1">XAU</p>
                            <p className="font-bold text-purple-700">
                              {formatXauPrice(convertToXau(parseFloat(pricing.maxPrice || '0'), pricing.currency))}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Currency Selection */}
                  {editingPrices && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium mb-2">Currency</label>
                      <select
                        value={priceValues.currency}
                        onChange={(e) => setPriceValues({...priceValues, currency: e.target.value})}
                        className="w-full p-2 border rounded"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="TRY">TRY - Turkish Lira</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                      <div className="flex space-x-2 mt-3">
                        <Button onClick={handleSavePrices} size="sm">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setEditingPrices(false)} size="sm">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* XAU Rate Info */}
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-amber-800">
                        <Coins className="w-4 h-4 inline mr-1" />
                        Current Gold Rates (Live)
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchXauRates}
                        disabled={xauLoading}
                      >
                        {xauLoading ? 'Updating...' : 'Refresh'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {xauRates.slice(0, 4).map((rate) => (
                        <div key={rate.currency} className="bg-white p-2 rounded">
                          <span className="font-medium">{rate.currency}:</span> 
                          <span className="text-amber-700"> ${rate.ratePerOz.toFixed(2)}/oz</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Last updated: {xauRates[0]?.updatedAt ? new Date(xauRates[0].updatedAt).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No pricing information available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Details & Actions */}
        <div className="space-y-6">
          {/* Product Info Tabs */}
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="variants">Variants</TabsTrigger>
                  <TabsTrigger value="specs">Specs</TabsTrigger>
                  <TabsTrigger value="ai">AI Content</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="space-y-4 mt-6">
                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {product.originalDescription}
                    </p>
                  </div>
                  
                  {keywords.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Category:</span>
                      <p className="text-gray-600">{product.category || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-medium">Vendor:</span>
                      <p className="text-gray-600">{product.vendor || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="variants" className="space-y-4 mt-6">
                  {variants.length > 0 ? (
                    variants.map((variant: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-3">{variant.name}</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {variant.options?.map((option: any, optIndex: number) => (
                            <div key={optIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{option.name}</span>
                              <div className="text-right">
                                {option.price && (
                                  <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                      {formatCurrency(option.price, option.currency || 'TRY')}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                      {formatXauPrice(convertToXau(parseFloat(option.price), option.currency || 'TRY'))}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No variants found</p>
                  )}
                </TabsContent>
                
                <TabsContent value="specs" className="space-y-4 mt-6">
                  {specifications ? (
                    <div className="space-y-3">
                      {Object.entries(specifications).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                          <span className="text-gray-700">{value?.toString() || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No specifications available</p>
                  )}
                </TabsContent>
                
                <TabsContent value="ai" className="space-y-4 mt-6">
                  {aiContent ? (
                    <div className="space-y-4">
                      {Object.entries(aiContent).map(([lang, content]: [string, any]) => (
                        <div key={lang} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-2 uppercase">{lang}</h4>
                          <div className="space-y-2">
                            <div>
                              <strong className="text-sm">Title:</strong>
                              <p className="text-sm text-gray-700">{content.title}</p>
                            </div>
                            <div>
                              <strong className="text-sm">Description:</strong>
                              <p className="text-sm text-gray-700">{content.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No AI content generated yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AI Rewrite Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wand2 className="w-5 h-5 mr-2" />
                  AI Content
                </CardTitle>
                <CardDescription>
                  Generate multi-language content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleRewrite}
                  disabled={rewriting}
                  className="w-full"
                  size="lg"
                >
                  {rewriting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      {product.isProcessed ? 'Regenerate' : 'Generate'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Publish Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="w-5 h-5 mr-2" />
                  Publish
                </CardTitle>
                <CardDescription>
                  Publish to platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Platforms:</label>
                  <div className="space-y-2">
                    {['shopify', 'prestashop', 'etsy'].map((platform) => (
                      <label key={platform} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform])
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform))
                            }
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{platform}</span>
                        {publishedTo[platform]?.success && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            ✓
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                
                <Button 
                  onClick={handlePublish}
                  disabled={publishing || selectedPlatforms.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {publishing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Publish ({selectedPlatforms.length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Publishing Status */}
          {Object.keys(publishedTo).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Publishing Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(publishedTo).map(([platform, result]: [string, any]) => (
                    <div key={platform} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium capitalize">{platform}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <>
                            <Badge variant="secondary" className="text-xs">
                              ID: {result.productId}
                            </Badge>
                            {result.url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={result.url} target="_blank" rel="noopener noreferrer">
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </a>
                              </Button>
                            )}
                          </>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
