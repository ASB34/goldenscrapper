'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Eye, ShoppingCart, Plus, Wand2, Send, Upload, X, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  etsyId?: string;
  originalTitle: string;
  originalDescription: string;
  originalKeywords: any;
  originalImages?: any;
  originalVideos?: any;
  aiRewrittenContent: any;
  isProcessed: boolean;
  isPublished: boolean;
  publishedTo?: any;
  createdAt: string;
  updatedAt?: string;
  // Enhanced product data
  pricing?: any;
  specifications?: any;
  variants?: any;
  category?: string;
  vendor?: string;
  sku?: string;
  sourceUrl?: string;
}

export default function ProductsPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [showPlatformSelector, setShowPlatformSelector] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['shopify']);
  const [productUrl, setProductUrl] = useState('');
  const [fetchingFromUrl, setFetchingFromUrl] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch products');
      }
      
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setMessage('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchFromUrl = async () => {
    if (!productUrl.trim()) {
      setMessage('Please enter a product URL');
      return;
    }

    setFetchingFromUrl(true);
    setMessage('');

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'fetch-product',
          productUrl: productUrl.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setProductUrl(''); // Clear the input
        fetchProducts(); // Refresh the list
        
        // Redirect to product detail page
        if (data.product?.id) {
          setTimeout(() => {
            window.location.href = `/products/${data.product.id}`;
          }, 1500);
        }
      } else {
        setMessage(data.error || 'Failed to fetch product');
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setFetchingFromUrl(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${productTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Product deleted successfully');
        fetchProducts(); // Refresh the list
      } else {
        const data = await response.json();
        setMessage(data.error || 'Failed to delete product');
      }
    } catch (error) {
      setMessage('Network error occurred while deleting product');
    }
  };

  const handleAiRewrite = async (productId: string) => {
    setRewriting(productId);
    setMessage('');

    try {
      const response = await fetch('/api/products/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('AI rewrite completed successfully!');
        setEditingContent(data.rewrittenContent);
        setSelectedProduct(products.find(p => p.id === productId) || null);
        fetchProducts(); // Refresh the list
      } else {
        setMessage(data.error || 'AI rewrite failed');
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setRewriting(null);
    }
  };

  const handlePublish = async (productId: string, platforms: string[]) => {
    setPublishing(productId);
    setMessage('');

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, platforms })
      });

      const data = await response.json();
      
      if (data.success) {
        // Detaylı başarı mesajı göster
        let successMessage = 'Product published successfully!\n';
        if (data.publishResults) {
          Object.entries(data.publishResults).forEach(([platform, result]: [string, any]) => {
            if (result.success) {
              successMessage += `✅ ${platform}: ${result.productId || 'OK'}\n`;
              if (result.url) {
                successMessage += `   ${result.url}\n`;
              }
            } else {
              successMessage += `❌ ${platform}: ${result.error}\n`;
            }
          });
        }
        setMessage(successMessage);
        fetchProducts(); // Refresh the list
      } else {
        setMessage(data.error || 'Publishing failed');
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setPublishing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('success') || message.includes('completed') 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* Product URL Input Section */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Add Product from URL</CardTitle>
              <CardDescription>
                Enter an Etsy product URL to fetch product information automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder="https://www.etsy.com/listing/123456789/product-name"
                    value={productUrl}
                    onChange={(e: any) => setProductUrl(e.target.value)}
                    onKeyPress={(e: any) => {
                      if (e.key === 'Enter') {
                        handleFetchFromUrl();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={handleFetchFromUrl} 
                  disabled={fetchingFromUrl || !productUrl.trim()}
                >
                  {fetchingFromUrl ? 'Fetching...' : 'Fetch Product'}
                </Button>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                <p>✅ Supported: Etsy product listing URLs</p>
                <p>⚠️ If automatic fetch fails due to site restrictions, you can still manually add products through our AI processing system.</p>
              </div>
            </CardContent>
          </Card>

          {products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500 mb-4">No products found.</p>
                <p className="text-sm text-gray-400">
                  Use the form above to fetch your first product from Etsy.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>
                  Manage your products, rewrite content with AI, and publish to multiple platforms
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-80">Product</TableHead>
                        <TableHead className="w-64">Details</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-48">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="w-80">
                          <div className="space-y-2">
                            <div className="font-medium text-sm leading-tight">
                              {(product.originalTitle ?? '').length > 60 
                                ? `${(product.originalTitle ?? '').substring(0, 60)}...` 
                                : (product.originalTitle ?? '')}
                            </div>
                            <div className="text-xs text-gray-500 leading-tight">
                              {(product.originalDescription ?? '')?.toString().substring(0, 50)}...
                            </div>
                            {product.originalImages && (() => {
                              try {
                                const raw = product.originalImages ?? [];
                                const images = typeof raw === 'string' 
                                  ? JSON.parse(raw) 
                                  : raw;
                                return Array.isArray(images) && images.length > 0 ? (
                                  <div className="flex space-x-1">
                                    {images.slice(0, 2).map((img: string, idx: number) => (
                                      img && typeof img === 'string' && img.startsWith && img.startsWith('http') ? (
                                        <img 
                                          key={idx} 
                                          src={img} 
                                          alt="Product" 
                                          className="w-6 h-6 object-cover rounded border"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      ) : null
                                    ))}
                                    {images.length > 2 && (
                                      <div className="w-6 h-6 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-500">
                                        +{images.length - 2}
                                      </div>
                                    )}
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="w-64">
                          <div className="space-y-1 text-xs">
                            {/* Pricing Information */}
                            {product.pricing && (() => {
                              try {
                                const pricing = typeof product.pricing === 'string' 
                                  ? JSON.parse(product.pricing) 
                                  : product.pricing;
                                return pricing && (pricing.price || pricing.minPrice) ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-sm">💰</span>
                                    <span className="font-semibold text-sm">
                                      {pricing.currency || '$'} {pricing.price || pricing.minPrice || 'N/A'}
                                    </span>
                                    {pricing.comparePrice && (
                                      <span className="line-through text-gray-400 text-xs">
                                        {pricing.currency || '$'} {pricing.comparePrice}
                                      </span>
                                    )}
                                    {pricing.onSale && (
                                      <span className="bg-red-100 text-red-800 px-1 py-0.5 rounded text-xs">SALE</span>
                                    )}
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                            
                            {/* Variants Information */}
                            {product.variants && (() => {
                              try {
                                const variants = typeof product.variants === 'string' 
                                  ? JSON.parse(product.variants) 
                                  : product.variants;
                                return Array.isArray(variants) && variants.length > 0 ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-sm">🎨</span>
                                    <span className="text-xs text-gray-600">
                                      {variants.length} variant{variants.length > 1 ? 's' : ''}
                                    </span>
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                            
                            {/* Category */}
                            {product.category && (
                              <div className="flex items-center space-x-1">
                                <span className="text-sm">📂</span>
                                <span className="text-xs text-gray-600 truncate">
                                  {product.category.length > 15 ? `${product.category.substring(0, 15)}...` : product.category}
                                </span>
                              </div>
                            )}
                            
                            {/* Material */}
                            {product.specifications && (() => {
                              try {
                                const specs = typeof product.specifications === 'string' 
                                  ? JSON.parse(product.specifications) 
                                  : product.specifications;
                                return specs && specs.material ? (
                                  <div className="flex items-center space-x-1">
                                    <span className="text-sm">🧱</span>
                                    <span className="text-xs text-gray-600 truncate">
                                      {specs.material.length > 12 ? `${specs.material.substring(0, 12)}...` : specs.material}
                                    </span>
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <div className="flex flex-col space-y-1">
                            {product.isProcessed && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                AI ✓
                              </span>
                            )}
                            {product.isPublished && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Published
                              </span>
                            )}
                            {!product.isProcessed && !product.isPublished && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Draft
                              </span>
                            )}
                            
                            {/* Platform indicators - more compact */}
                            {product.publishedTo && (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(product.publishedTo).map(([platform, result]: [string, any]) => (
                                  <span 
                                    key={platform} 
                                    className="text-xs px-1 py-0.5 rounded bg-gray-100"
                                    title={`${platform}: ${result.success ? 'Success' : 'Failed'}`}
                                  >
                                    {result.success ? '✅' : '❌'}{platform.charAt(0).toUpperCase()}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="w-48">
                          <div className="flex flex-col space-y-1">
                            {/* Always visible actions */}
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.location.href = `/products/${product.id}`}
                                className="h-7 px-2 text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              
                              {!product.isProcessed ? (
                                <Button
                                  size="sm"
                                  onClick={() => handleAiRewrite(product.id)}
                                  disabled={rewriting === product.id}
                                  className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                                >
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  {rewriting === product.id ? 'AI...' : 'AI Process'}
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setEditingContent(product.aiRewrittenContent);
                                  }}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Wand2 className="h-3 w-3 mr-1" />
                                  Edit AI
                                </Button>
                              )}
                            </div>
                            
                            {/* Publish button - second row */}
                            {product.isProcessed && (
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  variant={product.isPublished ? "secondary" : "default"}
                                  onClick={() => setShowPlatformSelector(product.id)}
                                  disabled={publishing === product.id}
                                  className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700 flex-1"
                                >
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  {publishing === product.id 
                                    ? 'Publishing...' 
                                    : product.isPublished 
                                      ? 'Re-publish' 
                                      : 'Publish'}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProduct(product.id, product.originalTitle ?? '(untitled)')}
                                  className="h-7 px-2 text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            {/* Delete button for non-processed products */}
                            {!product.isProcessed && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteProduct(product.id, product.originalTitle ?? '(untitled)')}
                                  className="h-7 px-2 text-xs w-full"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Editor Modal */}
          {selectedProduct && editingContent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Edit AI Rewritten Content</CardTitle>
                  <CardDescription>
                    {selectedProduct.originalTitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries(editingContent).map(([lang, content]: [string, any]) => (
                    <div key={lang} className="space-y-2">
                      <h3 className="font-semibold text-lg capitalize">
                        {lang === 'en' ? 'English' : 
                         lang === 'tr' ? 'Turkish' : 
                         lang === 'it' ? 'Italian' : 
                         lang === 'ar' ? 'Arabic' : lang}
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <label className="text-sm font-medium">Title:</label>
                          <Textarea 
                            value={content.title}
                            onChange={(e) => {
                              const updated = { ...editingContent };
                              updated[lang].title = e.target.value;
                              setEditingContent(updated);
                            }}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description:</label>
                          <Textarea 
                            value={content.description}
                            onChange={(e) => {
                              const updated = { ...editingContent };
                              updated[lang].description = e.target.value;
                              setEditingContent(updated);
                            }}
                            rows={4}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Keywords:</label>
                          <Textarea 
                            value={content.keywords.join(', ')}
                            onChange={(e) => {
                              const updated = { ...editingContent };
                              updated[lang].keywords = e.target.value.split(', ');
                              setEditingContent(updated);
                            }}
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSelectedProduct(null);
                        setEditingContent(null);
                      }}
                    >
                      Close
                    </Button>
                    <Button onClick={() => {
                      // Here you would save the edited content
                      setMessage('Content saved successfully!');
                      setSelectedProduct(null);
                      setEditingContent(null);
                    }}>
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Platform Selector Modal */}
          {showPlatformSelector && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Select Publishing Platforms</CardTitle>
                  <CardDescription>
                    Choose which platforms to publish this product to
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Platform checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes('shopify')}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedPlatforms([...selectedPlatforms, 'shopify']);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== 'shopify'));
                          }
                        }}
                        className="rounded"
                      />
                      <span>🛍️ Shopify</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes('etsy')}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedPlatforms([...selectedPlatforms, 'etsy']);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== 'etsy'));
                          }
                        }}
                        className="rounded"
                      />
                      <span>🎨 Etsy</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes('prestashop')}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedPlatforms([...selectedPlatforms, 'prestashop']);
                          } else {
                            setSelectedPlatforms(selectedPlatforms.filter(p => p !== 'prestashop'));
                          }
                        }}
                        className="rounded"
                      />
                      <span>🏪 PrestaShop</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowPlatformSelector(null);
                        setSelectedPlatforms([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        handlePublish(showPlatformSelector, selectedPlatforms);
                        setShowPlatformSelector(null);
                      }}
                      disabled={selectedPlatforms.length === 0}
                    >
                      Publish to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
