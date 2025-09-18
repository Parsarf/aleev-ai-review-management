"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  Filter,
  MessageSquare,
  User,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  issueType: string;
  severity: string;
  status: string;
  assigneeId?: string;
  assignee?: {
    name: string;
    email: string;
  };
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  review: {
    id: string;
    stars: number;
    text: string;
    authorName?: string;
    platform: string;
    location: {
      name: string;
      business: {
        name: string;
      };
    };
  };
  comments: Array<{
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }>;
}

interface Filters {
  status: string;
  severity: string;
  assignee: string;
  search: string;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    status: "",
    severity: "",
    assignee: "",
    search: "",
  });
  const [newComment, setNewComment] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      // In a real app, you'd have a tickets API endpoint
      // For now, we'll simulate with empty data
      setTickets([]);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-orange-100 text-orange-800";
      case "CRITICAL":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "OPEN":
        return <AlertTriangle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4" />;
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4" />;
      case "CLOSED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const addComment = async (ticketId: string) => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      // In a real app, you'd call the API to add a comment
      toast.success("Comment added successfully");
      setNewComment("");
      fetchTickets(); // Refresh tickets
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      // In a real app, you'd call the API to update the ticket status
      toast.success("Ticket status updated");
      fetchTickets(); // Refresh tickets
    } catch (error) {
      console.error("Error updating ticket status:", error);
      toast.error("Failed to update ticket status");
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Issue Type</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crisis">Crisis Management</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="billing">Billing Question</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Severity</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Describe the issue..." rows={4} />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(false)}>
                  Create Ticket
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={filters.severity}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All severities</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Assignee</label>
              <Select
                value={filters.assignee}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assignee: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assignees</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  <SelectItem value="me">Assigned to me</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tickets ({tickets.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto">
                {tickets.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No tickets found
                  </div>
                ) : (
                  tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedTicket?.id === ticket.id
                          ? "bg-blue-50 border-blue-200"
                          : ""
                      }`}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {ticket.issueType}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {ticket.review.location.business.name}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Badge className={getSeverityColor(ticket.severity)}>
                            {ticket.severity}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Badge className={getStatusColor(ticket.status)}>
                          {getStatusIcon(ticket.status)}
                          <span className="ml-1">
                            {ticket.status.replace("_", " ")}
                          </span>
                        </Badge>
                        {ticket.dueDate && (
                          <>
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(ticket.dueDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <span>{selectedTicket.issueType}</span>
                      <Badge
                        className={getSeverityColor(selectedTicket.severity)}
                      >
                        {selectedTicket.severity}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTicket.review.location.business.name} •{" "}
                      {selectedTicket.review.location.name}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {getStatusIcon(selectedTicket.status)}
                      <span className="ml-1">
                        {selectedTicket.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Related Review */}
                <div>
                  <h4 className="font-medium mb-2">Related Review</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium">
                        {selectedTicket.review.authorName || "Anonymous"}
                      </span>
                      <Badge variant="outline">
                        {selectedTicket.review.platform}
                      </Badge>
                    </div>
                    <p className="text-gray-800 text-sm">
                      {selectedTicket.review.text}
                    </p>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h4 className="font-medium mb-2">
                    Comments ({selectedTicket.comments.length})
                  </h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedTicket.comments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {comment.author.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {comment.author}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 mt-1">
                            {comment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Comment */}
                <div>
                  <h4 className="font-medium mb-2">Add Comment</h4>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => addComment(selectedTicket.id)}
                        disabled={!newComment.trim()}
                        size="sm"
                      >
                        Add Comment
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) =>
                      updateTicketStatus(selectedTicket.id, value)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="RESOLVED">Resolved</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a Ticket
                  </h3>
                  <p className="text-gray-600">
                    Choose a ticket from the list to view details and manage it.
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
