"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Star,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Search,
  Flag,
} from "lucide-react";
import { toast } from "sonner";

interface Review {
  id: string;
  platform: string;
  platformId: string;
  stars: number;
  text: string;
  authorName?: string;
  authorAvatar?: string;
  url?: string;
  status: string;
  createdAt: string;
  location: {
    name: string;
    business: {
      name: string;
    };
  };
  reply?: {
    id: string;
    draftText?: string;
    finalText?: string;
    status: string;
    sentAt?: string;
  };
  ticket?: {
    id: string;
    severity: string;
    status: string;
  };
}

interface Filters {
  platforms: string[];
  statuses: string[];
  stars: number[];
  search: string;
}

export default function InboxPage() {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    platforms: [],
    statuses: [],
    stars: [],
    search: "",
  });
  const [replyText, setReplyText] = useState("");
  const [selectedTone, setSelectedTone] = useState("professional");

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filters.platforms.length > 0) {
        params.append("platforms", filters.platforms.join(","));
      }
      if (filters.statuses.length > 0) {
        params.append("statuses", filters.statuses.join(","));
      }
      if (filters.stars.length > 0) {
        params.append("stars", filters.stars.join(","));
      }

      const response = await fetch(`/api/reviews?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setReviews(data.reviews);
      } else {
        toast.error("Failed to fetch reviews");
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  const generateReply = async (reviewId: string) => {
    try {
      setGeneratingReply(true);
      const response = await fetch("/api/replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          reviewId,
          tone: selectedTone,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReplyText(data.reply.draftText || "");
        if (data.flagged) {
          toast.warning(`Reply flagged: ${data.reason}`);
        }
        if (data.isCrisis) {
          toast.error("Crisis detected - please handle carefully");
        }
        toast.success("Reply generated successfully");
      } else {
        toast.error(data.error || "Failed to generate reply");
      }
    } catch (error) {
      console.error("Error generating reply:", error);
      toast.error("Failed to generate reply");
    } finally {
      setGeneratingReply(false);
    }
  };

  const sendReply = async (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      setSendingReply(true);
      const response = await fetch("/api/replies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          replyId: selectedReview?.reply?.id,
          finalText: replyText,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Reply sent successfully");
        setReplyText("");
        fetchReviews(); // Refresh reviews
      } else {
        toast.error(data.error || "Failed to send reply");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NEEDS_REPLY":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "AUTO_SENT":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FLAGGED":
        return <Flag className="h-4 w-4 text-red-500" />;
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEEDS_REPLY":
        return "bg-yellow-100 text-yellow-800";
      case "AUTO_SENT":
        return "bg-green-100 text-green-800";
      case "FLAGGED":
        return "bg-red-100 text-red-800";
      case "RESOLVED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < stars ? "text-yellow-400 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Inbox</h1>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchReviews} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Filters and Review List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Platform</label>
                <Select
                  value={filters.platforms[0] || undefined}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      platforms: value === "ALL_PLATFORMS" ? [] : value ? [value] : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_PLATFORMS">All platforms</SelectItem>
                    <SelectItem value="GOOGLE">Google</SelectItem>
                    <SelectItem value="YELP">Yelp</SelectItem>
                    <SelectItem value="FACEBOOK">Facebook</SelectItem>
                    <SelectItem value="TRIPADVISOR">TripAdvisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.statuses[0] || undefined}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      statuses: value === "ALL_STATUS" ? [] : value ? [value] : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STATUS">All statuses</SelectItem>
                    <SelectItem value="NEEDS_REPLY">Needs Reply</SelectItem>
                    <SelectItem value="AUTO_SENT">Auto Sent</SelectItem>
                    <SelectItem value="FLAGGED">Flagged</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Rating</label>
                <Select
                  value={filters.stars[0]?.toString() || undefined}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      stars: value === "ALL_RATINGS" ? [] : value ? [parseInt(value)] : [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_RATINGS">All ratings</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                    <SelectItem value="4">4 stars</SelectItem>
                    <SelectItem value="3">3 stars</SelectItem>
                    <SelectItem value="2">2 stars</SelectItem>
                    <SelectItem value="1">1 star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search reviews..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: e.target.value,
                      }))
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reviews ({reviews.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedReview?.id === review.id
                        ? "bg-blue-50 border-blue-200"
                        : ""
                    }`}
                    onClick={() => setSelectedReview(review)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="flex items-center">
                            {renderStars(review.stars)}
                          </div>
                          <Badge className={getStatusColor(review.status)}>
                            {getStatusIcon(review.status)}
                            <span className="ml-1">
                              {review.status.replace("_", " ")}
                            </span>
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {review.text}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                          <span>{review.authorName || "Anonymous"}</span>
                          <span>•</span>
                          <span>{review.platform}</span>
                          <span>•</span>
                          <span>
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Detail and Reply Panel */}
        <div className="lg:col-span-2">
          {selectedReview ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{selectedReview.location.business.name}</span>
                      <Badge variant="outline">{selectedReview.platform}</Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedReview.location.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center">
                      {renderStars(selectedReview.stars)}
                    </div>
                    <Badge className={getStatusColor(selectedReview.status)}>
                      {getStatusIcon(selectedReview.status)}
                      <span className="ml-1">
                        {selectedReview.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Review</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-800">{selectedReview.text}</p>
                    <div className="flex items-center space-x-2 mt-3 text-sm text-gray-600">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedReview.authorAvatar || ""} />
                        <AvatarFallback>
                          {selectedReview.authorName?.charAt(0) || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedReview.authorName || "Anonymous"}</span>
                      <span>•</span>
                      <span>
                        {new Date(selectedReview.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="reply" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="reply">Reply</TabsTrigger>
                    <TabsTrigger value="ticket">Create Ticket</TabsTrigger>
                  </TabsList>

                  <TabsContent value="reply" className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Tone</label>
                      <Select
                        value={selectedTone}
                        onValueChange={setSelectedTone}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">
                            Professional
                          </SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="apologetic">Apologetic</SelectItem>
                          <SelectItem value="empathetic">Empathetic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Reply</label>
                      <Textarea
                        placeholder="Generate or write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={6}
                      />
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => generateReply(selectedReview.id)}
                        disabled={generatingReply}
                        variant="outline"
                      >
                        {generatingReply
                          ? "Generating..."
                          : "Generate AI Reply"}
                      </Button>
                      <Button
                        onClick={() => sendReply(selectedReview.id)}
                        disabled={sendingReply || !replyText.trim()}
                      >
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="ticket" className="space-y-4">
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        Create Support Ticket
                      </h3>
                      <p className="text-gray-600 mb-4">
                        This review requires special attention and should be
                        escalated to a support ticket.
                      </p>
                      <Button variant="outline">Create Ticket</Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Review
                  </h3>
                  <p className="text-gray-600">
                    Choose a review from the list to view details and respond.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
