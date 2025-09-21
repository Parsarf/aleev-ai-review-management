"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Settings as SettingsIcon,
  Shield,
  Link,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Business {
  id: string;
  name: string;
  brandRules: string;
  tone: string;
  locations: Array<{
    id: string;
    name: string;
    address?: string;
    platformAccounts?: Record<string, any>;
  }>;
}

interface PlatformConnection {
  platform: string;
  connected: boolean;
  accountName?: string;
  lastSync?: string;
}

export default function SettingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [businessName, setBusinessName] = useState("");
  const [brandRules, setBrandRules] = useState("");
  const [tone, setTone] = useState("professional");
  const [autoSendThreshold, setAutoSendThreshold] = useState(4);
  const [crisisAlerts, setCrisisAlerts] = useState(true);

  // Location form states
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  // Platform connections
  const [platformConnections, setPlatformConnections] = useState<
    PlatformConnection[]
  >([
    { platform: "Google", connected: false },
    { platform: "Yelp", connected: false },
    { platform: "Facebook", connected: false },
    { platform: "TripAdvisor", connected: false },
  ]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/settings");
      const data = await response.json();

      if (response.ok) {
        setBusinesses(data.businesses);
        if (data.businesses.length > 0) {
          setSelectedBusiness(data.businesses[0]);
          setBusinessName(data.businesses[0].name);
          setBrandRules(data.businesses[0].brandRules || "");
          setTone(data.businesses[0].tone || "professional");
        }
      } else {
        toast.error("Failed to fetch settings");
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const saveBusinessSettings = async () => {
    if (!selectedBusiness) return;

    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "updateBusiness",
          businessId: selectedBusiness.id,
          name: businessName,
          brandRules,
          tone,
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
        fetchSettings(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async () => {
    if (!selectedBusiness || !locationName.trim()) {
      toast.error("Please enter a location name");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createLocation",
          businessId: selectedBusiness.id,
          name: locationName,
          address: locationAddress,
        }),
      });

      if (response.ok) {
        toast.success("Location added successfully");
        setLocationName("");
        setLocationAddress("");
        fetchSettings(); // Refresh data
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add location");
      }
    } catch (error) {
      console.error("Error adding location:", error);
      toast.error("Failed to add location");
    } finally {
      setSaving(false);
    }
  };

  const connectPlatform = async (platform: string) => {
    // In a real app, this would initiate OAuth flow
    toast.info(`Connecting to ${platform}...`);

    // Simulate connection
    setTimeout(() => {
      setPlatformConnections((prev) =>
        prev.map((p) =>
          p.platform === platform
            ? {
                ...p,
                connected: true,
                accountName: "Connected Account",
                lastSync: new Date().toISOString(),
              }
            : p,
        ),
      );
      toast.success(`Connected to ${platform} successfully`);
    }, 2000);
  };

  const disconnectPlatform = async (platform: string) => {
    setPlatformConnections((prev) =>
      prev.map((p) =>
        p.platform === platform
          ? {
              ...p,
              connected: false,
              accountName: undefined,
              lastSync: undefined,
            }
          : p,
      ),
    );
    toast.success(`Disconnected from ${platform}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No Businesses Found
        </h3>
        <p className="text-gray-600">You need to create a business first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedBusiness?.id ?? undefined}
            onValueChange={(value) => {
              const business = businesses.find((b) => b.id === value);
              if (business) {
                setSelectedBusiness(business);
                setBusinessName(business.name);
                setBrandRules(business.brandRules || "");
                setTone(business.tone || "professional");
              }
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select business" />
            </SelectTrigger>
            <SelectContent>
              {businesses.map((business) => (
                <SelectItem key={business.id} value={business.id}>
                  {business.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="business" className="space-y-6">
        <TabsList>
          <TabsTrigger value="business">Business Profile</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Enter business name"
                />
              </div>

              <div>
                <Label htmlFor="brandRules">Brand Rules</Label>
                <Textarea
                  id="brandRules"
                  value={brandRules}
                  onChange={(e) => setBrandRules(e.target.value)}
                  placeholder="Enter your brand guidelines and rules for AI responses..."
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  These rules will guide AI-generated responses to maintain your
                  brand voice.
                </p>
              </div>

              <div>
                <Label htmlFor="tone">Default Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="apologetic">Apologetic</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveBusinessSettings} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Locations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedBusiness?.locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{location.name}</h4>
                    {location.address && (
                      <p className="text-sm text-gray-600">
                        {location.address}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Add New Location</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="locationName">Location Name</Label>
                    <Input
                      id="locationName"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="Enter location name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="locationAddress">Address (Optional)</Label>
                    <Input
                      id="locationAddress"
                      value={locationAddress}
                      onChange={(e) => setLocationAddress(e.target.value)}
                      placeholder="Enter address"
                    />
                  </div>
                  <Button
                    onClick={addLocation}
                    disabled={saving || !locationName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Location
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Link className="h-5 w-5 mr-2" />
                Platform Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {platformConnections.map((connection) => (
                <div
                  key={connection.platform}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {connection.platform.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium">{connection.platform}</h4>
                      {connection.connected ? (
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">
                            Connected
                          </span>
                          {connection.accountName && (
                            <span className="text-sm text-gray-600">
                              • {connection.accountName}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            Not connected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {connection.connected ? (
                      <>
                        <Badge variant="outline">Active</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            disconnectPlatform(connection.platform)
                          }
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => connectPlatform(connection.platform)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="h-5 w-5 mr-2" />
                AI Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoSend">
                    Auto-send for 4-5 star reviews
                  </Label>
                  <p className="text-sm text-gray-500">
                    Automatically send AI-generated replies for positive reviews
                  </p>
                </div>
                <Switch id="autoSend" />
              </div>

              <div>
                <Label htmlFor="autoSendThreshold">Auto-send threshold</Label>
                <Select
                  value={autoSendThreshold.toString()}
                  onValueChange={(value) =>
                    setAutoSendThreshold(parseInt(value))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="5">5 stars only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="crisisAlerts">Crisis alerts</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when crisis keywords are detected in reviews
                  </p>
                </div>
                <Switch
                  id="crisisAlerts"
                  checked={crisisAlerts}
                  onCheckedChange={setCrisisAlerts}
                />
              </div>

              <div className="flex justify-end">
                <Button disabled={saving}>
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
