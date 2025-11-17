import type { Customer, Order, CustomerSegment } from "@shared/schema";

export interface RFMScore {
  recency: number;
  frequency: number;
  monetary: number;
}

export interface CustomerRFMData {
  customerId: string;
  lastOrderDate: Date | null;
  orderCount: number;
  totalSpent: number;
  rfmScore: RFMScore;
  segment: string;
}

export function calculateRFMScore(
  lastOrderDate: Date | null,
  orderCount: number,
  totalSpent: number,
  referenceDate: Date = new Date()
): RFMScore {
  const recency = lastOrderDate
    ? Math.floor((referenceDate.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const recencyScore = recency <= 30 ? 5 : recency <= 60 ? 4 : recency <= 90 ? 3 : recency <= 180 ? 2 : 1;
  const frequencyScore = orderCount >= 10 ? 5 : orderCount >= 5 ? 4 : orderCount >= 3 ? 3 : orderCount >= 1 ? 2 : 1;
  const monetaryScore = totalSpent >= 10000 ? 5 : totalSpent >= 5000 ? 4 : totalSpent >= 1000 ? 3 : totalSpent >= 100 ? 2 : 1;

  return {
    recency: recencyScore,
    frequency: frequencyScore,
    monetary: monetaryScore,
  };
}

export function assignRFMSegment(rfmScore: RFMScore): string {
  const { recency, frequency, monetary } = rfmScore;
  const total = recency + frequency + monetary;

  if (recency >= 4 && frequency >= 4 && monetary >= 4) {
    return 'Champions';
  }
  
  if (recency >= 3 && frequency >= 3 && monetary >= 3) {
    return 'Loyal Customers';
  }
  
  if (recency >= 4 && frequency <= 2) {
    return 'New Customers';
  }
  
  if (recency >= 3 && frequency <= 2 && monetary >= 3) {
    return 'Promising';
  }
  
  if (recency <= 2 && frequency >= 3 && monetary >= 3) {
    return 'At Risk';
  }
  
  if (recency <= 2 && frequency >= 4 && monetary >= 4) {
    return 'Cant Lose Them';
  }
  
  if (recency <= 2 && frequency <= 2) {
    return 'Lost';
  }
  
  if (recency >= 3 && frequency >= 2 && monetary <= 2) {
    return 'Potential Loyalists';
  }

  return 'Needs Attention';
}

export function evaluateSegmentCriteria(
  customer: Customer,
  orders: Order[],
  criteria: Record<string, any>
): boolean {
  if (criteria.type === 'rfm') {
    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    const lastOrderDate = orders.length > 0
      ? new Date(Math.max(...orders.map(o => new Date(o.createdAt || 0).getTime())))
      : null;

    const rfmScore = calculateRFMScore(lastOrderDate, orderCount, totalSpent);
    const segment = assignRFMSegment(rfmScore);

    return criteria.segments?.includes(segment) || false;
  }

  if (criteria.type === 'behavioral') {
    if (criteria.minOrders !== undefined && orders.length < criteria.minOrders) {
      return false;
    }
    
    if (criteria.maxOrders !== undefined && orders.length > criteria.maxOrders) {
      return false;
    }

    const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
    if (criteria.minSpent !== undefined && totalSpent < criteria.minSpent) {
      return false;
    }
    
    if (criteria.maxSpent !== undefined && totalSpent > criteria.maxSpent) {
      return false;
    }

    return true;
  }

  if (criteria.type === 'smart') {
    const rules = criteria.rules || [];
    
    for (const rule of rules) {
      const { field, operator, value } = rule;
      
      if (field === 'orderCount') {
        const orderCount = orders.length;
        if (operator === 'gt' && orderCount <= value) return false;
        if (operator === 'gte' && orderCount < value) return false;
        if (operator === 'lt' && orderCount >= value) return false;
        if (operator === 'lte' && orderCount > value) return false;
        if (operator === 'eq' && orderCount !== value) return false;
      }
      
      if (field === 'totalSpent') {
        const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
        if (operator === 'gt' && totalSpent <= value) return false;
        if (operator === 'gte' && totalSpent < value) return false;
        if (operator === 'lt' && totalSpent >= value) return false;
        if (operator === 'lte' && totalSpent > value) return false;
        if (operator === 'eq' && totalSpent !== value) return false;
      }
      
      if (field === 'daysSinceLastOrder') {
        const lastOrderDate = orders.length > 0
          ? new Date(Math.max(...orders.map(o => new Date(o.createdAt || 0).getTime())))
          : null;
        const daysSince = lastOrderDate
          ? Math.floor((new Date().getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
          : 9999;
        if (operator === 'gt' && daysSince <= value) return false;
        if (operator === 'gte' && daysSince < value) return false;
        if (operator === 'lt' && daysSince >= value) return false;
        if (operator === 'lte' && daysSince > value) return false;
        if (operator === 'eq' && daysSince !== value) return false;
      }
      
      if (field === 'tags') {
        const customerTags = customer.tags || [];
        if (operator === 'contains' && !customerTags.includes(value)) return false;
        if (operator === 'notContains' && customerTags.includes(value)) return false;
      }
    }
    
    return true;
  }

  if (criteria.type === 'custom') {
    if (criteria.tags && Array.isArray(criteria.tags)) {
      const customerTags = customer.tags || [];
      const hasRequiredTags = criteria.tags.some((tag: string) =>
        customerTags.includes(tag)
      );
      if (!hasRequiredTags) return false;
    }

    if (criteria.createdAfter) {
      const customerCreatedAt = new Date(customer.createdAt || 0);
      const afterDate = new Date(criteria.createdAfter);
      if (customerCreatedAt < afterDate) return false;
    }

    if (criteria.createdBefore) {
      const customerCreatedAt = new Date(customer.createdAt || 0);
      const beforeDate = new Date(criteria.createdBefore);
      if (customerCreatedAt > beforeDate) return false;
    }

    return true;
  }

  return false;
}

export const DEFAULT_SEGMENTS = [
  {
    name: 'Champions',
    description: 'Bought recently, buy often and spend the most',
    type: 'rfm' as const,
    criteria: { type: 'rfm', segments: ['Champions'] },
  },
  {
    name: 'Loyal Customers',
    description: 'Buy on a regular basis',
    type: 'rfm' as const,
    criteria: { type: 'rfm', segments: ['Loyal Customers'] },
  },
  {
    name: 'At Risk',
    description: 'Haven\'t purchased recently but were valuable customers',
    type: 'rfm' as const,
    criteria: { type: 'rfm', segments: ['At Risk', 'Cant Lose Them'] },
  },
  {
    name: 'Lost',
    description: 'Haven\'t purchased in a very long time',
    type: 'rfm' as const,
    criteria: { type: 'rfm', segments: ['Lost'] },
  },
  {
    name: 'New Customers',
    description: 'Recent customers with few orders',
    type: 'rfm' as const,
    criteria: { type: 'rfm', segments: ['New Customers', 'Promising'] },
  },
];
