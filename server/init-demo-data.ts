import { storage } from "./storage";
import { generateOptimizedDemoData } from "./optimized-demo-data";

async function isDataComplete(): Promise<boolean> {
  const businesses = await storage.getBusinesses();
  
  if (businesses.length === 0) {
    return false;
  }

  // Check if at least the first business has complete data
  const firstBusiness = businesses[0];
  const [customers, conversations, products, orders, analytics, templates, broadcasts, automations] = await Promise.all([
    storage.getCustomers(firstBusiness.id),
    storage.getConversations(firstBusiness.id),
    storage.getProducts(firstBusiness.id),
    storage.getOrders(firstBusiness.id),
    storage.getAnalytics(firstBusiness.id),
    storage.getTemplates(firstBusiness.id),
    storage.getBroadcasts(firstBusiness.id),
    storage.getAutomations(firstBusiness.id),
  ]);

  const hasCompleteData = 
    customers.length > 0 &&
    conversations.length > 0 &&
    products.length > 0 &&
    orders.length > 0 &&
    analytics.length > 0 &&
    templates.length > 0 &&
    broadcasts.length > 0 &&
    automations.length > 0;

  if (!hasCompleteData) {
    console.log('Incomplete data detected:', {
      businesses: businesses.length,
      customers: customers.length,
      conversations: conversations.length,
      products: products.length,
      orders: orders.length,
      analytics: analytics.length,
      templates: templates.length,
      broadcasts: broadcasts.length,
      automations: automations.length,
    });
  }

  return hasCompleteData;
}

export async function initializeDemoDataIfNeeded() {
  try {
    const dataComplete = await isDataComplete();
    
    if (!dataComplete) {
      console.log("Incomplete or missing demo data. Regenerating...");
      await storage.clearAll();
      await generateOptimizedDemoData();
      console.log("✓ Demo data generation complete (3 businesses with AI conversations)!");
    } else {
      const businesses = await storage.getBusinesses();
      console.log(`Found ${businesses.length} businesses with complete data. Skipping generation.`);
    }
  } catch (error) {
    console.error("Error initializing demo data:", error);
    console.log("Attempting to regenerate demo data...");
    try {
      await storage.clearAll();
      await generateOptimizedDemoData();
      console.log("✓ Demo data generation complete (3 businesses with AI conversations)!");
    } catch (retryError) {
      console.error("Failed to generate demo data on retry:", retryError);
      console.log("Continuing without demo data...");
    }
  }
}
