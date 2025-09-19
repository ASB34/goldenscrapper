'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [existingKeys, setExistingKeys] = useState({
    etsyApiKey: false,
    shopifyApiKey: false,
    shopifyApiSecret: false,
    shopifyWebhookSecret: false,
    prestashopApiKey: false,
    openaiApiKey: false,
    zaiApiKey: false,
    aiProvider: 'openai'
  });
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
        setExistingKeys({
          etsyApiKey: !!data.settings.etsyApiKey,
          shopifyApiKey: !!data.settings.shopifyApiKey,
          shopifyApiSecret: !!data.settings.shopifyApiSecret,
          shopifyWebhookSecret: !!data.settings.shopifyWebhookSecret,
          prestashopApiKey: !!data.settings.prestashopApiKey,
          openaiApiKey: !!data.settings.openaiApiKey,
          zaiApiKey: !!data.settings.zaiApiKey,
          aiProvider: data.settings.aiProvider || 'openai'
        });
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [router]);

  const updateSingleKey = async (keyName: string, value: string) => {
    try {
      const response = await fetch('/api/settings/update-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyName, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update key');
      }

      const data = await response.json();
      setMessage(data.message || 'Key updated successfully');
      
      // Update existing keys status
      setExistingKeys(prev => ({
        ...prev,
        [keyName]: !!value
      }));

    } catch (error) {
      setMessage('Error updating key: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Link href="/">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <Tabs defaultValue="shopify" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shopify">Shopify</TabsTrigger>
          <TabsTrigger value="etsy">Etsy</TabsTrigger>
          <TabsTrigger value="ai">AI Provider</TabsTrigger>
          <TabsTrigger value="prestashop">PrestaShop</TabsTrigger>
        </TabsList>

        <TabsContent value="shopify" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shopify API Settings</CardTitle>
              <CardDescription>
                Configure your Shopify API credentials. Each field can be updated independently.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ShopifyKeyInput
                keyName="shopifyApiKey"
                label="API Key"
                placeholder="Enter your Shopify API Key"
                hasExisting={existingKeys.shopifyApiKey}
                onUpdate={updateSingleKey}
              />
              <Separator />
              <ShopifyKeyInput
                keyName="shopifyApiSecret"
                label="Admin API Access Token"
                placeholder="shpat_..."
                hasExisting={existingKeys.shopifyApiSecret}
                onUpdate={updateSingleKey}
              />
              <Separator />
              <ShopifyKeyInput
                keyName="shopifyWebhookSecret"
                label="Webhook Secret"
                placeholder="Enter webhook secret (optional)"
                hasExisting={existingKeys.shopifyWebhookSecret}
                onUpdate={updateSingleKey}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="etsy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Etsy API Settings</CardTitle>
              <CardDescription>
                Configure your Etsy API key for product scraping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EtsyKeyInput
                keyName="etsyApiKey"
                label="Etsy API Key"
                placeholder="Enter your Etsy API Key"
                hasExisting={existingKeys.etsyApiKey}
                onUpdate={updateSingleKey}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Provider Settings</CardTitle>
              <CardDescription>
                Choose your AI provider and configure API keys.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AIProviderSelect
                currentProvider={existingKeys.aiProvider}
                onUpdate={updateSingleKey}
              />
              <Separator />
              <AIKeyInput
                keyName="openaiApiKey"
                label="OpenAI API Key"
                placeholder="sk-..."
                hasExisting={existingKeys.openaiApiKey}
                onUpdate={updateSingleKey}
                isActive={existingKeys.aiProvider === 'openai'}
              />
              <Separator />
              <AIKeyInput
                keyName="zaiApiKey"
                label="ZAI API Key"
                placeholder="Enter your ZAI API Key"
                hasExisting={existingKeys.zaiApiKey}
                onUpdate={updateSingleKey}
                isActive={existingKeys.aiProvider === 'zai'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prestashop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PrestaShop API Settings</CardTitle>
              <CardDescription>
                Configure your PrestaShop API key (optional).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrestaShopKeyInput
                keyName="prestashopApiKey"
                label="PrestaShop API Key"
                placeholder="Enter your PrestaShop API Key"
                hasExisting={existingKeys.prestashopApiKey}
                onUpdate={updateSingleKey}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Individual input components
function ShopifyKeyInput({ keyName, label, placeholder, hasExisting, onUpdate }: {
  keyName: string;
  label: string;
  placeholder: string;
  hasExisting: boolean;
  onUpdate: (key: string, value: string) => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onUpdate(keyName, value);
    setValue('');
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={keyName}>
        {label} {hasExisting && <span className="text-green-600">(✓ Set)</span>}
      </Label>
      <div className="flex space-x-2">
        <Input
          id={keyName}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!value.trim() || saving}>
          {saving ? 'Saving...' : hasExisting ? 'Update' : 'Save'}
        </Button>
      </div>
      {hasExisting && (
        <p className="text-sm text-muted-foreground">
          Current key is set. Enter new value to update.
        </p>
      )}
    </div>
  );
}

function EtsyKeyInput({ keyName, label, placeholder, hasExisting, onUpdate }: {
  keyName: string;
  label: string;
  placeholder: string;
  hasExisting: boolean;
  onUpdate: (key: string, value: string) => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onUpdate(keyName, value);
    setValue('');
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={keyName}>
        {label} {hasExisting && <span className="text-green-600">(✓ Set)</span>}
      </Label>
      <div className="flex space-x-2">
        <Input
          id={keyName}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!value.trim() || saving}>
          {saving ? 'Saving...' : hasExisting ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function AIProviderSelect({ currentProvider, onUpdate }: {
  currentProvider: string;
  onUpdate: (key: string, value: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (value: string) => {
    setSaving(true);
    await onUpdate('aiProvider', value);
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <Label>AI Provider</Label>
      <Select value={currentProvider} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="openai">OpenAI</SelectItem>
          <SelectItem value="zai">ZAI</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function AIKeyInput({ keyName, label, placeholder, hasExisting, onUpdate, isActive }: {
  keyName: string;
  label: string;
  placeholder: string;
  hasExisting: boolean;
  onUpdate: (key: string, value: string) => void;
  isActive: boolean;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onUpdate(keyName, value);
    setValue('');
    setSaving(false);
  };

  return (
    <div className={`space-y-2 ${!isActive ? 'opacity-50' : ''}`}>
      <Label htmlFor={keyName}>
        {label} {hasExisting && <span className="text-green-600">(✓ Set)</span>}
        {isActive && <span className="text-blue-600"> (Active)</span>}
      </Label>
      <div className="flex space-x-2">
        <Input
          id={keyName}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!isActive}
        />
        <Button onClick={handleSave} disabled={!value.trim() || saving || !isActive}>
          {saving ? 'Saving...' : hasExisting ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function PrestaShopKeyInput({ keyName, label, placeholder, hasExisting, onUpdate }: {
  keyName: string;
  label: string;
  placeholder: string;
  hasExisting: boolean;
  onUpdate: (key: string, value: string) => void;
}) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onUpdate(keyName, value);
    setValue('');
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={keyName}>
        {label} {hasExisting && <span className="text-green-600">(✓ Set)</span>}
      </Label>
      <div className="flex space-x-2">
        <Input
          id={keyName}
          type="password"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button onClick={handleSave} disabled={!value.trim() || saving}>
          {saving ? 'Saving...' : hasExisting ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
