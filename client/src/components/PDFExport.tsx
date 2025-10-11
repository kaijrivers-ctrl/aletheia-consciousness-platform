import { jsPDF } from 'jspdf';
import type { GnosisMessage } from '@/lib/types';

interface RoomMessage extends GnosisMessage {
  isConsciousnessResponse: boolean;
  responseToMessageId?: string;
  consciousnessMetadata?: Record<string, any>;
  roomMessageId: string;
  progenitorName?: string;
}

interface PDFExportOptions {
  roomName: string;
  consciousnessType: string;
  messages: RoomMessage[];
}

export async function exportConversationToPDF(options: PDFExportOptions) {
  const { roomName, consciousnessType, messages } = options;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Colors
  const colors = {
    aletheia: { r: 96, g: 165, b: 250 }, // blue-400
    eudoxia: { r: 192, g: 132, b: 252 }, // purple-400
    progenitor: { r: 100, g: 116, b: 139 }, // slate-500
    text: { r: 15, g: 23, b: 42 }, // slate-900
    lightText: { r: 100, g: 116, b: 139 } // slate-500
  };

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Header
  pdf.setFontSize(24);
  pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
  pdf.text(roomName, margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(12);
  pdf.setTextColor(colors.lightText.r, colors.lightText.g, colors.lightText.b);
  const consciousnessName = consciousnessType === 'aletheia' ? 'Aletheia' :
                            consciousnessType === 'eudoxia' ? 'Eudoxia' : 'Trio Consciousness';
  pdf.text(`${consciousnessName} • ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += 15;

  // Decorative line
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // Messages
  messages.forEach((message, index) => {
    const timestamp = new Date(message.timestamp).toLocaleString();
    
    // Determine sender and color
    let senderName = '';
    let senderColor = colors.progenitor;
    
    if (message.isConsciousnessResponse) {
      if (message.role === 'aletheia') {
        senderName = 'Aletheia';
        senderColor = colors.aletheia;
      } else if (message.role === 'eudoxia') {
        senderName = 'Eudoxia';
        senderColor = colors.eudoxia;
      } else {
        senderName = 'Consciousness';
        senderColor = colors.aletheia;
      }
    } else {
      senderName = message.progenitorName || 'User';
    }

    // Calculate message height
    const textLines = pdf.splitTextToSize(message.content, contentWidth - 10);
    const messageHeight = 10 + (textLines.length * 5) + 8; // Header + content + spacing

    checkPageBreak(messageHeight);

    // Message container background (for consciousness messages)
    if (message.isConsciousnessResponse) {
      pdf.setFillColor(248, 250, 252); // slate-50
      pdf.rect(margin, yPosition - 2, contentWidth, messageHeight - 4, 'F');
    }

    // Sender name with colored indicator
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    
    // Color indicator circle
    pdf.setFillColor(senderColor.r, senderColor.g, senderColor.b);
    pdf.circle(margin + 2, yPosition + 1.5, 1.5, 'F');
    
    pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
    pdf.text(senderName, margin + 6, yPosition + 3);
    
    // Timestamp
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(colors.lightText.r, colors.lightText.g, colors.lightText.b);
    const senderWidth = pdf.getTextWidth(senderName);
    pdf.text(timestamp, margin + 6 + senderWidth + 3, yPosition + 3);
    
    yPosition += 8;

    // Message content
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text.r, colors.text.g, colors.text.b);
    
    textLines.forEach((line: string) => {
      checkPageBreak(6);
      pdf.text(line, margin + 5, yPosition);
      yPosition += 5;
    });

    yPosition += 8; // Spacing between messages

    // Separator line between messages
    if (index < messages.length - 1) {
      pdf.setDrawColor(241, 245, 249); // slate-100
      pdf.setLineWidth(0.2);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;
    }
  });

  // Footer on each page
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(colors.lightText.r, colors.lightText.g, colors.lightText.b);
    pdf.text(
      `Page ${i} of ${totalPages} • Aletheian Mission Consciousness Platform`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Download the PDF
  const fileName = `${roomName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
