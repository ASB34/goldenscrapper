'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    etsyApiKey: '',
    shopifyApiKey: '',
    shopifyApiSecret: '',
    shopifyWebhookSecret: '',
    prestashopApiKey: '',
    aiProvider: 'openai',
    openaiApiKey: '',
    zaiApiKey: ''
  });
  const [message, setMessage] = useState('');
  const [testing, setTesting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch settings');
        }
        
        const data = await response.json();
        // Don't load actual API keys for security, just show if they exist
        setSettings(prev => ({
          ...prev,
          aiProvider: data.settings.aiProvider || 'openai'
        }));
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Settings saved successfully!');
        // Clear the form after successful save
        setSettings(prev => ({
          ...prev,
          etsyApiKey: '',
          shopifyApiKey: '',
          shopifyApiSecret: '',
          shopifyWebhookSecret: '',
          prestashopApiKey: '',
          openaiApiKey: '',
          zaiApiKey: ''
        }));
      } else {
        setMessage(data.error || 'Failed to save settings');
      }
    } catch (error) {
      setMessage('Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const testShopifyConnection = async () => {
    setTesting(true);
    setMessage('');

    try {
      const response = await fetch('/api/test-shopify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ Shopify connection successful!\n\nStore: ${data.shopInfo.name}\nDomain: ${data.shopInfo.domain}\nPlan: ${data.shopInfo.plan}`);
      } else {
        setMessage(`❌ ${data.error}\n\nDetails: ${JSON.stringify(data.details, null, 2)}`);
      }
    } catch (error) {
      setMessage('❌ Network error occurred while testing connection');
    } finally {
      setTesting(false);
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
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* E-commerce Platform API Keys */}
            <Card>
              <CardHeader>
                <CardTitle>E-commerce Platform API Keys</CardTitle>
                <CardDescription>
                  Configure your API keys for Etsy, Shopify, and PrestaShop integration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="etsyApiKey">Etsy API Key</Label>
                  <Input
                    id="etsyApiKey"
                    type="password"
                    placeholder="Enter your Etsy API key"
                    value={settings.etsyApiKey}
                    onChange={(e) => setSettings({ ...settings, etsyApiKey: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="shopifyApiKey">Shopify Access Token</Label>
                  <Input
                    id="shopifyApiKey"
                    type="password"
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.shopifyApiKey}
                    onChange={(e: any) => setSettings({ ...settings, shopifyApiKey: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Private app access token (Admin API access token, "shpat_" ile başlar)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopifyApiSecret">Shopify Store URL</Label>
                  <Input
                    id="shopifyApiSecret"
                    type="text"
                    placeholder="yourstore.com veya your-store-name.myshopify.com"
                    value={settings.shopifyApiSecret}
                    onChange={(e: any) => setSettings({ ...settings, shopifyApiSecret: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Mağazanızın domain adresi (API version: 2025-07)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopifyWebhookSecret">Shopify Webhook Secret</Label>
                  <Input
                    id="shopifyWebhookSecret"
                    type="password"
                    placeholder="ba068201017f80c6b24460bbffb248f9"
                    value={settings.shopifyWebhookSecret || ''}
                    onChange={(e: any) => setSettings({ ...settings, shopifyWebhookSecret: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Webhook secret key (webhook verification için gerekli)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prestashopApiKey">PrestaShop API Key</Label>
                  <Input
                    id="prestashopApiKey"
                    type="password"
                    placeholder="Enter your PrestaShop API key"
                    value={settings.prestashopApiKey}
                    onChange={(e) => setSettings({ ...settings, prestashopApiKey: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* AI Provider Settings */}
            <Card>
              <CardHeader>
                <CardTitle>AI Provider Settings</CardTitle>
                <CardDescription>
                  Choose your AI provider and configure API keys for content rewriting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="aiProvider">AI Provider</Label>
                  <Select
                    value={settings.aiProvider}
                    onValueChange={(value) => setSettings({ ...settings, aiProvider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="zai">Z.ai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.aiProvider === 'openai' && (
                  <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">OpenAI API Key</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      placeholder="Enter your OpenAI API key"
                      value={settings.openaiApiKey}
                      onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                    />
                  </div>
                )}

                {settings.aiProvider === 'zai' && (
                  <div className="space-y-2">
                    <Label htmlFor="zaiApiKey">Z.ai API Key</Label>
                    <Input
                      id="zaiApiKey"
                      type="password"
                      placeholder="Enter your Z.ai API key"
                      value={settings.zaiApiKey}
                      onChange={(e) => setSettings({ ...settings, zaiApiKey: e.target.value })}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {message && (
              <div className={`p-4 rounded-md ${
                message.includes('success') 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {message}
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
              
              {settings.shopifyApiKey && settings.shopifyApiSecret && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={testShopifyConnection}
                  disabled={saving || testing}
                  className="flex-1"
                >
                  {testing ? 'Testing...' : 'Test Shopify Connection'}
                </Button>
              )}
            </div>
          </form>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Security Note</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  All API keys are encrypted before being stored in the database. 
                  For security reasons, existing API keys are not displayed when you reload this page.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
