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
  const [editingVariants, setEditingVariants] = useState(false)
  const [bulkPercentage, setBulkPercentage] = useState('')
  const [variantPrices, setVariantPrices] = useState<{[key: string]: string}>({})
  const [variantQuantities, setVariantQuantities] = useState<{[key: string]: string}>({})
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
        
        // Initialize variant prices
        const variants = parseJsonSafely(data.product.variants) || []
        const initialPrices: {[key: string]: string} = {}
        
        variants.forEach((variant: any, variantIndex: number) => {
          variant.options?.forEach((option: any, optionIndex: number) => {
            const key = `${variantIndex}-${optionIndex}`
            if (option.price) {
              initialPrices[key] = option.price
            }
          })
        })
        
        setVariantPrices(initialPrices)
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
      } else {
        // Try to parse the response body for a helpful error message
        let bodyText = '';
        try {
          const data = await response.json();
          bodyText = JSON.stringify(data);
        } catch (e) {
          try { bodyText = await response.text(); } catch { bodyText = '<unreadable response>' }
        }
        console.error('Publish failed', response.status, bodyText)
        alert('Publish failed: ' + (bodyText || response.status))
      }
    } catch (error) {
      console.error('Error publishing product:', error)
      alert('Network error while publishing: ' + (error instanceof Error ? error.message : String(error)))
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

  // Bulk percentage change function
  const applyBulkPriceChange = () => {
    if (!bulkPercentage || !product) return
    
    const percentage = parseFloat(bulkPercentage)
    if (isNaN(percentage)) return
    
    const multiplier = 1 + (percentage / 100)
    
    // Update main prices
    const newPriceValues = { ...priceValues }
    if (newPriceValues.price) {
      newPriceValues.price = (parseFloat(newPriceValues.price) * multiplier).toFixed(2)
    }
    if (newPriceValues.comparePrice) {
      newPriceValues.comparePrice = (parseFloat(newPriceValues.comparePrice) * multiplier).toFixed(2)
    }
    if (newPriceValues.minPrice) {
      newPriceValues.minPrice = (parseFloat(newPriceValues.minPrice) * multiplier).toFixed(2)
    }
    if (newPriceValues.maxPrice) {
      newPriceValues.maxPrice = (parseFloat(newPriceValues.maxPrice) * multiplier).toFixed(2)
    }
    setPriceValues(newPriceValues)
    
    // Update variant prices
    const variants = parseJsonSafely(product.variants) || []
    const newVariantPrices = { ...variantPrices }
    
    variants.forEach((variant: any, variantIndex: number) => {
      variant.options?.forEach((option: any, optionIndex: number) => {
        const key = `${variantIndex}-${optionIndex}`
        if (option.price) {
          const currentPrice = variantPrices[key] || option.price
          newVariantPrices[key] = (parseFloat(currentPrice) * multiplier).toFixed(2)
        }
      })
    })
    
    setVariantPrices(newVariantPrices)
  }

  // Initialize variant prices when product loads
  const initializeVariantPrices = () => {
    if (!product) return
    
    const variants = parseJsonSafely(product.variants) || []
    const initialPrices: {[key: string]: string} = {}
    const initialQuantities: {[key: string]: string} = {}
    
    variants.forEach((variant: any, variantIndex: number) => {
      variant.options?.forEach((option: any, optionIndex: number) => {
        const key = `${variantIndex}-${optionIndex}`
        if (option.price) {
          initialPrices[key] = option.price
        }
        // Initialize quantity with existing value or default to 10
        initialQuantities[key] = option.quantity?.toString() || '10'
      })
    })
    
    setVariantPrices(initialPrices)
    setVariantQuantities(initialQuantities)
  }

  const updateVariantPrice = (variantIndex: number, optionIndex: number, newPrice: string) => {
    const key = `${variantIndex}-${optionIndex}`
    setVariantPrices(prev => ({
      ...prev,
      [key]: newPrice
    }))
  }

  const updateVariantQuantity = (variantIndex: number, optionIndex: number, newQuantity: string) => {
    const key = `${variantIndex}-${optionIndex}`
    setVariantQuantities(prev => ({
      ...prev,
      [key]: newQuantity
    }))
  }

  // Save variant prices to database
  const saveVariantPrices = async () => {
    if (!product) return

    try {
      // Prepare variants data with updated pricing and quantities
      const variants = parseJsonSafely(product.variants) || []
      const updatedVariants = variants.map((variant: any, variantIndex: number) => {
        const updatedOptions = variant.options?.map((option: any, optionIndex: number) => {
          const key = `${variantIndex}-${optionIndex}`
          const updatedPrice = variantPrices[key] || option.price
          const updatedQuantity = variantQuantities[key] || option.quantity || '10'
          
          return {
            ...option,
            price: updatedPrice,
            quantity: parseInt(updatedQuantity),
            usdPrice: parseFloat(updatedPrice), // Will be converted by API
            usdComparePrice: option.comparePrice ? parseFloat(option.comparePrice) : null
          }
        }) || []

        return {
          ...variant,
          options: updatedOptions
        }
      })

      console.log('💾 Saving variant prices and quantities:', updatedVariants)

      const response = await fetch(`/api/products/${product.id}/variants`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: updatedVariants })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Variant prices saved successfully:', data)
        await fetchProduct() // Refresh product data
        setEditingVariants(false)
        // Reset variant prices to new saved values
        initializeVariantPrices()
      } else {
        const error = await response.json()
        console.error('❌ Failed to save variant prices:', error)
        alert('Failed to save variant prices: ' + (error.details || error.error))
      }
    } catch (error) {
      console.error('❌ Error saving variant prices:', error)
      alert('Error saving variant prices: ' + (error instanceof Error ? error.message : 'Unknown error'))
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
                    <div className="space-y-6">
                      {/* Bulk Price Change Tool */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-blue-800 flex items-center">
                            📊 Bulk Price Adjustment
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingVariants(!editingVariants)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {editingVariants ? 'View Mode' : 'Edit Mode'}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-blue-700 mb-1">
                              Percentage Change
                            </label>
                            <input
                              type="number"
                              value={bulkPercentage}
                              onChange={(e) => setBulkPercentage(e.target.value)}
                              placeholder="e.g., 10 for +10%, -15 for -15%"
                              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                              step="0.1"
                            />
                          </div>
                          <div className="text-sm text-blue-600">
                            {bulkPercentage && (
                              <p>
                                {parseFloat(bulkPercentage) > 0 ? '📈' : '📉'} 
                                {parseFloat(bulkPercentage) > 0 ? ' Increase' : ' Decrease'} all prices by {Math.abs(parseFloat(bulkPercentage) || 0)}%
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={applyBulkPriceChange}
                            disabled={!bulkPercentage || isNaN(parseFloat(bulkPercentage))}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Apply to All Prices
                          </Button>
                        </div>
                      </div>

                      {/* Variants List */}
                      {variants.map((variant: any, variantIndex: number) => (
                        <div key={variantIndex} className="border rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-lg text-gray-800">{variant.name}</h4>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {variant.options?.length || 0} options
                            </Badge>
                          </div>
                          
                          <div className="space-y-3">
                            {variant.options?.map((option: any, optionIndex: number) => {
                              const variantKey = `${variantIndex}-${optionIndex}`
                              const currentPrice = variantPrices[variantKey] || option.price || '0'
                              const currentQuantity = variantQuantities[variantKey] || option.quantity || '10'
                              
                              return (
                                <div key={optionIndex} className="bg-gray-50 p-4 rounded-lg border">
                                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                                    {/* Option Name */}
                                    <div className="md:col-span-1">
                                      <span className="font-medium text-gray-700">{option.name}</span>
                                    </div>
                                    
                                    {/* Original Currency Price */}
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Original ({option.currency || 'TRY'})</p>
                                      {editingVariants ? (
                                        <input
                                          type="number"
                                          value={currentPrice}
                                          onChange={(e) => updateVariantPrice(variantIndex, optionIndex, e.target.value)}
                                          className="w-full p-2 border rounded text-center font-medium"
                                          step="0.01"
                                        />
                                      ) : (
                                        <p className="font-bold text-green-700">
                                          {formatCurrency(currentPrice, option.currency || 'TRY')}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* USD Equivalent */}
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">USD Equivalent</p>
                                      <p className="font-bold text-blue-700">
                                        {option.currency === 'USD' ? 
                                          formatCurrency(currentPrice, 'USD') : 
                                          formatCurrency(
                                            convertFromXau(
                                              convertToXau(parseFloat(currentPrice), option.currency || 'TRY'), 
                                              'USD'
                                            ), 
                                            'USD'
                                          )
                                        }
                                      </p>
                                    </div>
                                    
                                    {/* XAU (Troy Ounce) */}
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Gold (XAU)</p>
                                      <p className="font-bold text-amber-700 text-sm">
                                        {formatXauPrice(convertToXau(parseFloat(currentPrice), option.currency || 'TRY'))}
                                      </p>
                                    </div>
                                    
                                    {/* Stock Quantity */}
                                    <div className="text-center">
                                      <p className="text-xs text-gray-500 mb-1">Stock</p>
                                      {editingVariants ? (
                                        <input
                                          type="number"
                                          value={currentQuantity}
                                          onChange={(e) => updateVariantQuantity(variantIndex, optionIndex, e.target.value)}
                                          className="w-full p-2 border rounded text-center font-medium"
                                          min="0"
                                          step="1"
                                          placeholder="Qty"
                                        />
                                      ) : (
                                        <p className="font-bold text-gray-700">
                                          {currentQuantity} pcs
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Price Change Indicator */}
                                  {editingVariants && option.price !== currentPrice && (
                                    <div className="mt-2 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                                      <p className="text-xs text-yellow-700">
                                        Original: {formatCurrency(option.price, option.currency || 'TRY')} → 
                                        New: {formatCurrency(currentPrice, option.currency || 'TRY')} 
                                        {parseFloat(currentPrice) > parseFloat(option.price) ? 
                                          <span className="text-green-600"> (↑ {(((parseFloat(currentPrice) - parseFloat(option.price)) / parseFloat(option.price)) * 100).toFixed(1)}%)</span> :
                                          <span className="text-red-600"> (↓ {(((parseFloat(option.price) - parseFloat(currentPrice)) / parseFloat(option.price)) * 100).toFixed(1)}%)</span>
                                        }
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Variant Summary */}
                          {variant.options && variant.options.length > 0 && (
                            <div className="mt-4 p-3 bg-purple-50 rounded border">
                              <h5 className="font-medium text-purple-800 mb-2">📋 Variant Summary</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Options:</span>
                                  <span className="ml-2 font-semibold">{variant.options.length}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Price Range:</span>
                                  <span className="ml-2 font-semibold text-green-600">
                                    {formatCurrency(
                                      Math.min(...variant.options.map((opt: any) => parseFloat(variantPrices[`${variantIndex}-${variant.options.indexOf(opt)}`] || opt.price || '0'))), 
                                      variant.options[0]?.currency || 'TRY'
                                    )} - {formatCurrency(
                                      Math.max(...variant.options.map((opt: any) => parseFloat(variantPrices[`${variantIndex}-${variant.options.indexOf(opt)}`] || opt.price || '0'))), 
                                      variant.options[0]?.currency || 'TRY'
                                    )}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">XAU Range:</span>
                                  <span className="ml-2 font-semibold text-amber-600 text-xs">
                                    {convertToXau(
                                      Math.min(...variant.options.map((opt: any) => parseFloat(variantPrices[`${variantIndex}-${variant.options.indexOf(opt)}`] || opt.price || '0'))), 
                                      variant.options[0]?.currency || 'TRY'
                                    ).toFixed(4)} - {convertToXau(
                                      Math.max(...variant.options.map((opt: any) => parseFloat(variantPrices[`${variantIndex}-${variant.options.indexOf(opt)}`] || opt.price || '0'))), 
                                      variant.options[0]?.currency || 'TRY'
                                    ).toFixed(4)} oz
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Type:</span>
                                  <span className="ml-2 font-semibold capitalize">{variant.type || 'dropdown'}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Save Changes Button */}
                      {editingVariants && (
                        <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-800">💾 Save Variant Prices</h4>
                              <p className="text-sm text-gray-600">Save all variant price changes to database</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setEditingVariants(false)
                                  initializeVariantPrices() // Reset to original prices
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={saveVariantPrices}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save All Changes
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎨</div>
                      <p className="text-gray-500 text-lg">No variants found</p>
                      <p className="text-gray-400 text-sm">This product doesn't have any variants or options</p>
                    </div>
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
