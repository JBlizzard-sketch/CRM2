import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type { Customer, Order, Conversation, Message, AnalyticsDaily } from '@shared/schema';

export class ExportService {
  async exportToCSV(data: any[], filename: string): Promise<Buffer> {
    const csv = Papa.unparse(data);
    return Buffer.from(csv, 'utf-8');
  }

  async exportToExcel(sheets: Array<{ name: string; data: any[] }>, filename: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    
    for (const sheet of sheets) {
      const worksheet = workbook.addWorksheet(sheet.name);
      
      if (sheet.data.length > 0) {
        const headers = Object.keys(sheet.data[0]);
        worksheet.addRow(headers);
        
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        
        sheet.data.forEach((row) => {
          const values = headers.map((header) => {
            const value = row[header];
            if (value instanceof Date) {
              return value.toISOString();
            }
            if (typeof value === 'object' && value !== null) {
              return JSON.stringify(value);
            }
            return value;
          });
          worksheet.addRow(values);
        });
        
        worksheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value?.toString() || '';
            maxLength = Math.max(maxLength, cellValue.length);
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportToPDF(
    title: string,
    headers: string[],
    data: any[][],
    filename: string
  ): Promise<Buffer> {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    autoTable(doc, {
      head: [headers],
      body: data,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 66, 66] },
    });
    
    return Buffer.from(doc.output('arraybuffer'));
  }

  prepareCustomersForExport(customers: Customer[]): any[] {
    return customers.map(c => ({
      ID: c.id,
      Name: c.name,
      Phone: c.phone,
      Email: c.email || '',
      Tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
      'Created At': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
    }));
  }

  prepareOrdersForExport(orders: Order[]): any[] {
    return orders.map(o => ({
      ID: o.id,
      'Customer ID': o.customerId,
      Status: o.status,
      Total: o.total,
      'Created At': o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
      'Updated At': o.updatedAt ? new Date(o.updatedAt).toLocaleString() : '',
    }));
  }

  prepareConversationsForExport(conversations: Conversation[]): any[] {
    return conversations.map(c => ({
      ID: c.id,
      'Customer ID': c.customerId,
      Channel: c.channel,
      Status: c.status,
      'Last Message': c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : '',
      'Created At': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
    }));
  }

  prepareMessagesForExport(messages: Message[]): any[] {
    return messages.map(m => ({
      ID: m.id,
      'Conversation ID': m.conversationId,
      Direction: m.direction,
      Channel: m.channel,
      Content: m.content,
      'Created At': m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
    }));
  }

  prepareAnalyticsForExport(analytics: AnalyticsDaily[]): any[] {
    return analytics.map(a => ({
      Date: a.date,
      'Messages Sent': a.messagesSent,
      'Messages Received': a.messagesReceived,
      'Orders Count': a.ordersCount,
      Revenue: a.revenue,
      'New Customers': a.newCustomers,
    }));
  }
}
