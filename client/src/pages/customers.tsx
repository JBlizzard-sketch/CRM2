import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Mail, Phone, Tag, Users, ArrowUpDown, DollarSign, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CustomerWithCLV } from "@shared/schema";

interface CustomersProps {
  businessId: string;
}

export default function Customers({ businessId }: CustomersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortByCLV, setSortByCLV] = useState<'asc' | 'desc' | null>(null);

  const { data: customers, isLoading, isError, error } = useQuery<CustomerWithCLV[]>({
    queryKey: ["/api/customers", businessId],
    enabled: !!businessId,
  });

  const filteredAndSortedCustomers = customers
    ?.filter((customer) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(searchLower) ||
        customer.phone.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.tags?.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      if (!sortByCLV) return 0;
      return sortByCLV === 'desc' 
        ? b.lifetimeValue - a.lifetimeValue 
        : a.lifetimeValue - b.lifetimeValue;
    });

  const toggleCLVSort = () => {
    if (sortByCLV === null) setSortByCLV('desc');
    else if (sortByCLV === 'desc') setSortByCLV('asc');
    else setSortByCLV(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { 
      style: 'currency', 
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!filteredAndSortedCustomers || filteredAndSortedCustomers.length === 0) return;

    // CSV headers
    const headers = ['Name', 'Phone', 'Email', 'Tags', 'Lifetime Value', 'Joined'];
    
    // CSV rows
    const rows = filteredAndSortedCustomers.map(customer => [
      customer.name,
      customer.phone,
      customer.email || 'N/A',
      customer.tags?.join('; ') || 'None',
      customer.lifetimeValue.toFixed(2),
      customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Select a Business</h2>
          <p className="text-muted-foreground">
            Choose a business to view customers
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Customers</h2>
          <p className="text-muted-foreground">
            {error?.message || "Failed to load customers. Please try again."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground">Manage your customer relationships</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedCustomers?.length || 0} customers
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-customers"
          />
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          disabled={!filteredAndSortedCustomers || filteredAndSortedCustomers.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={toggleCLVSort}
                    data-testid="button-sort-clv"
                  >
                    <DollarSign className="h-3 w-3 mr-1" />
                    Lifetime Value
                    <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCustomers && filteredAndSortedCustomers.length > 0 ? (
                filteredAndSortedCustomers.map((customer) => (
                  <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-xs">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="text-xs">{customer.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {customer.tags && customer.tags.length > 0 ? (
                          customer.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold" data-testid={`text-clv-${customer.id}`}>
                      {formatCurrency(customer.lifetimeValue)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {customer.createdAt
                        ? new Date(customer.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No customers found matching your search" : "No customers yet"}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
