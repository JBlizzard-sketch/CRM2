import { readFileSync } from 'fs';
import { join } from 'path';
import { storage } from './storage';
import type {
  Business,
  InsertBusiness,
  InsertProduct,
  InsertMessageTemplate,
  InsertAutomation,
  InsertAnalyticsDaily,
} from '@shared/schema';

interface SeedBusiness {
  name: string;
  slug: string;
  products: Array<{
    name: string;
    description: string;
    price: number;
    stock: number;
    attributes: Record<string, any>;
  }>;
}

interface SeedTemplate {
  name: string;
  category: 'marketing' | 'utility' | 'authentication' | 'service';
  content: string;
  language: string;
  variables: string[];
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
}

interface SeedAutomation {
  name: string;
  trigger: string;
  action: string;
  status: 'active' | 'inactive';
  config: Record<string, any>;
}

function loadJSON<T>(filename: string): T {
  const path = join(process.cwd(), 'server', 'seed-data', filename);
  const content = readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function loadSeedData() {
  console.log('Loading seed data from JSON files...');

  try {
    const businesses = loadJSON<SeedBusiness[]>('businesses.json');
    const templateDefinitions = loadJSON<SeedTemplate[]>('templates.json');
    const automationDefinitions = loadJSON<SeedAutomation[]>('automations.json');

    for (const bizData of businesses) {
      console.log(`Seeding business: ${bizData.name}...`);
      
      const existingBusinesses = await storage.getBusinesses();
      let business = existingBusinesses.find(b => b.slug === bizData.slug);
      
      if (!business) {
        business = await storage.createBusiness({
          name: bizData.name,
          slug: bizData.slug,
        } as InsertBusiness);
      }

      for (const productData of bizData.products) {
        const products = await storage.getProducts(business.id);
        const existingProduct = products.find(p => p.name === productData.name);
        
        if (!existingProduct) {
          await storage.createProduct({
            businessId: business.id,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            stock: productData.stock,
            attributes: productData.attributes,
          } as InsertProduct);
        }
      }

      const templates = await storage.getTemplates(business.id);
      for (const templateData of templateDefinitions) {
        const existing = templates.find(t => t.name === templateData.name);
        
        if (!existing) {
          await storage.createTemplate({
            businessId: business.id,
            name: templateData.name,
            category: templateData.category,
            content: templateData.content,
            language: templateData.language,
            variables: templateData.variables,
            status: templateData.status,
            whatsappTemplateId: `wa_${randomInt(10000, 99999)}`,
            metadata: { source: 'seed' },
          } as InsertMessageTemplate);
        }
      }

      const automations = await storage.getAutomations(business.id);
      for (const autoData of automationDefinitions) {
        const existing = automations.find(a => a.name === autoData.name);
        
        if (!existing) {
          await storage.createAutomation({
            businessId: business.id,
            name: autoData.name,
            trigger: autoData.trigger,
            action: autoData.action,
            status: autoData.status,
            config: autoData.config,
          } as InsertAutomation);
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const analytics = await storage.getAnalytics(business.id, today, today);
      
      if (analytics.length === 0) {
        await storage.createAnalytics({
          businessId: business.id,
          date: today,
          messagesSent: randomInt(20, 50),
          messagesReceived: randomInt(30, 70),
          ordersCount: randomInt(5, 15),
          revenue: randomInt(15000, 45000),
          newCustomers: randomInt(3, 10),
          metadata: { source: 'seed' },
        } as InsertAnalyticsDaily);
      }

      console.log(`✓ ${business.name} seeded successfully`);
    }

    console.log('✓ All seed data loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading seed data:', error);
    throw error;
  }
}
