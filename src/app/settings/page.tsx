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
  Link,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2,
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

interface PlatformDef {
  platform: string;
  supported: boolean;
}

const PLATFORM_DEFS: PlatformDef[] = [
  { platform: "Google", supported: true },
  { platform: "Yelp", supported: false },
  { platform: "Facebook", supported: false },
  { platform: "TripAdvisor", supported: false },
];

interface GoogleAccount {
  name: string;
  accountName: string;
}

interface GoogleLocation {
  name: string;
  locationName: string;
  address?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

type ConnectStep =
  | "idle"
  | "loadingAccounts"
  | "pickAccount"
  | "loadingLocations"
  | "pickLocation"
  | "saving";

export default function SettingsPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [brandRules, setBrandRules] = useState("");
  const [tone, setTone] = useState("professional");
  const [autoSendThreshold, setAutoSendThreshold] = useState(4);
  const [crisisAlerts, setCrisisAlerts] = useState(true);

  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const [googleConnectStep, setGoogleConnectStep] =
    useState<ConnectStep>("idle");
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>([]);
  const [googleLocations, setGoogleLocations] = useState<GoogleLocation[]>([]);
  const [selectedGoogleAccount, setSelectedGoogleAccount] =
    useState<GoogleAccount | null>(null);

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
        headers: { "Content-Type": "application/json" },
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
        fetchSettings();
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
        headers: { "Content-Type": "application/json" },
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
        fetchSettings();
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

  const startGoogleConnect = async () => {
    setGoogleConnectStep("loadingAccounts");
    try {
      const res = await fetch("/api/integrations/google/accounts");
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load Google accounts");
        setGoogleConnectStep("idle");
        return;
      }
      setGoogleAccounts(data.accounts || []);
      setGoogleConnectStep("pickAccount");
    } catch {
      toast.error("Failed to load Google accounts");
      setGoogleConnectStep("idle");
    }
  };

  const pickGoogleAccount = async (account: GoogleAccount) => {
    setSelectedGoogleAccount(account);
    setGoogleConnectStep("loadingLocations");
    // Use the full resource name as the accountId query param — the backend
    // will pass it straight through to getGoogleLocations which accepts
    // either the bare ID or the full path.
    const accountId = account.name.split("/").pop()!;
    try {
      const res = await fetch(
        `/api/integrations/google/locations?accountId=${encodeURIComponent(accountId)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load Google locations");
        setGoogleConnectStep("pickAccount");
        return;
      }
      setGoogleLocations(data.locations || []);
      setGoogleConnectStep("pickLocation");
    } catch {
      toast.error("Failed to load Google locations");
      setGoogleConnectStep("pickAccount");
    }
  };

  const pickGoogleLocation = async (location: GoogleLocation) => {
    if (!selectedBusiness || !selectedGoogleAccount) return;
    const targetLocation = selectedBusiness.locations[0];
    if (!targetLocation) {
      toast.error("No location found to link");
      setGoogleConnectStep("idle");
      return;
    }

    setGoogleConnectStep("saving");
    // Extract bare IDs from the resource names regardless of whether the API
    // returns "accounts/{a}/locations/{id}" or just "locations/{id}".
    const accountId = selectedGoogleAccount.name.split("/").pop()!;
    const locationId = location.name.split("/").pop()!;

    const existingAccounts =
      (targetLocation.platformAccounts as Record<string, any>) || {};
    const updatedAccounts = {
      ...existingAccounts,
      google: {
        accountId,
        locationId,
        accountName: selectedGoogleAccount.accountName,
        locationName: location.locationName,
      },
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLocation",
          locationId: targetLocation.id,
          name: targetLocation.name,
          platformAccounts: updatedAccounts,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save Google connection");
      } else {
        toast.success("Google Business Profile connected");
        await fetchSettings();
      }
    } catch {
      toast.error("Failed to save Google connection");
    } finally {
      setGoogleConnectStep("idle");
      setGoogleAccounts([]);
      setGoogleLocations([]);
      setSelectedGoogleAccount(null);
    }
  };

  const cancelGoogleConnect = () => {
    setGoogleConnectStep("idle");
    setGoogleAccounts([]);
    setGoogleLocations([]);
    setSelectedGoogleAccount(null);
  };

  const disconnectGoogle = async () => {
    if (!selectedBusiness) return;
    const targetLocation = selectedBusiness.locations[0];
    if (!targetLocation) return;

    const existingAccounts =
      (targetLocation.platformAccounts as Record<string, any>) || {};
    const { google: _removed, ...rest } = existingAccounts;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLocation",
          locationId: targetLocation.id,
          name: targetLocation.name,
          platformAccounts: rest,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to disconnect Google");
      } else {
        toast.success("Google Business Profile disconnected");
        await fetchSettings();
      }
    } catch {
      toast.error("Failed to disconnect Google");
    }
  };

  const getGoogleConnectionState = () => {
    if (!selectedBusiness) return null;
    const firstLocation = selectedBusiness.locations[0];
    if (!firstLocation?.platformAccounts) return null;
    const accounts = firstLocation.platformAccounts as Record<string, any>;
    return accounts.google || null;
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

  const googleConnection = getGoogleConnectionState();
  const isGoogleConnected = !!googleConnection;
  const isGoogleBusy =
    googleConnectStep !== "idle" && googleConnectStep !== "saving";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedBusiness?.id || undefined}
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
              {PLATFORM_DEFS.map(({ platform, supported }) => {
                const isGoogle = platform === "Google";
                const connected = isGoogle ? isGoogleConnected : false;

                return (
                  <div
                    key={platform}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {platform.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-medium">{platform}</h4>
                        {connected ? (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">
                              Connected
                            </span>
                            {googleConnection?.accountName && isGoogle && (
                              <span className="text-sm text-gray-600">
                                • {googleConnection.accountName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {supported ? "Not connected" : "Coming soon"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!supported ? (
                        <Badge variant="secondary">Coming Soon</Badge>
                      ) : connected ? (
                        <>
                          <Badge variant="outline">Active</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={disconnectGoogle}
                          >
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={startGoogleConnect}
                          disabled={
                            googleConnectStep !== "idle" &&
                            googleConnectStep !== "pickAccount" &&
                            googleConnectStep !== "pickLocation"
                          }
                        >
                          {googleConnectStep === "loadingAccounts" ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : null}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {googleConnectStep === "pickAccount" && googleAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Select a Google Business Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {googleAccounts.map((account) => (
                  <button
                    key={account.name}
                    className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => pickGoogleAccount(account)}
                  >
                    <p className="font-medium">{account.accountName}</p>
                    <p className="text-sm text-gray-500">{account.name}</p>
                  </button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={cancelGoogleConnect}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {googleConnectStep === "loadingLocations" && (
            <Card>
              <CardContent className="flex items-center space-x-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  Loading locations for{" "}
                  {selectedGoogleAccount?.accountName}...
                </span>
              </CardContent>
            </Card>
          )}

          {googleConnectStep === "pickLocation" &&
            googleLocations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {googleLocations.map((loc) => (
                    <button
                      key={loc.name}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      onClick={() => pickGoogleLocation(loc)}
                    >
                      <p className="font-medium">{loc.locationName}</p>
                      {loc.address && (
                        <p className="text-sm text-gray-500">
                          {[
                            ...(loc.address.addressLines || []),
                            loc.address.locality,
                            loc.address.administrativeArea,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={cancelGoogleConnect}
                  >
                    Cancel
                  </Button>
                </CardContent>
              </Card>
            )}

          {googleConnectStep === "saving" && (
            <Card>
              <CardContent className="flex items-center space-x-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  Saving Google connection...
                </span>
              </CardContent>
            </Card>
          )}
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
