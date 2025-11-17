import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function inspectDatabaseSchema() {
  try {
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.error('Error fetching tables:', error);
      return { tables: [], columns: {} };
    }

    const columnInfo: Record<string, any[]> = {};
    
    if (tables && tables.length > 0) {
      for (const table of tables) {
        const tableName = table.table_name;
        const { data: columns } = await supabaseAdmin
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', tableName);
        
        if (columns) {
          columnInfo[tableName] = columns;
        }
      }
    }

    return { tables: tables || [], columns: columnInfo };
  } catch (error) {
    console.error('Error inspecting database:', error);
    return { tables: [], columns: {} };
  }
}
