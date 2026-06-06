import React, { useState, useRef, useCallback, forwardRef } from 'react';
import { Download, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface InvoiceButtonProps {
  studentId: number;
  studentName: string;
  className?: string;
  variant?: 'default' | 'text';
  children?: React.ReactNode;
}

const InvoiceButton = forwardRef<HTMLDivElement, InvoiceButtonProps>(({ 
  studentId, 
  studentName, 
  className = '', 
  variant = 'default',
  children 
}, ref) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const componentRef = useRef<HTMLDivElement>(null);
  const printComponentRef = (ref as React.RefObject<HTMLDivElement>) || componentRef;

  const generatePdf = useCallback(async () => {
    const element = printComponentRef.current;
    if (!element) {
      throw new Error('No content to generate PDF from');
    }
    
    try {
      // Create a clone of the node to avoid affecting the original
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        allowTaint: true,
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // Ensure all images are loaded
          const images = Array.from(clonedDoc.images);
          if (images.length > 0) {
            return Promise.all(images.map(img => {
              if (!img.complete) {
                return new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve; // Resolve on error to continue
                });
              }
              return Promise.resolve();
            }));
          }
          return Promise.resolve();
        }
      });

      // Clean up the cloned element
      document.body.removeChild(clone);
      
      if (!canvas) {
        throw new Error('Failed to capture content');
      }

      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData === 'data:,') {
        throw new Error('Failed to generate image data from content');
      }
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to maintain aspect ratio
      const widthRatio = pageWidth / canvas.width;
      const heightRatio = pageHeight / canvas.height;
      const ratio = Math.min(widthRatio, heightRatio, 1);
      
      const imgX = (pageWidth - canvas.width * ratio) / 2;
      const imgY = 10; // 10mm from top
      
      // Add the image to PDF with error handling
      try {
        pdf.addImage(
          imgData,
          'PNG',
          imgX,
          imgY,
          canvas.width * ratio,
          canvas.height * ratio,
          undefined,
          'FAST'
        );
      } catch (error) {
        console.error('Error adding image to PDF:', error);
        throw new Error('Failed to add content to PDF. The content might contain unsupported elements.');
      }
      
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  }, [printComponentRef]);

  const handleDownload = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const pdf = await generatePdf();
      if (!pdf) return;
      
      const fileName = `invoice_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('Invoice downloaded as PDF!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  }, [generatePdf, isGenerating, studentName]);

  const handlePrint = useReactToPrint({
    pageContent: () => printComponentRef.current || null,
    onAfterPrint: () => {
      setIsGenerating(false);
      toast.success('Invoice printed successfully!');
    },
    onBeforeGetContent: async () => {
      setIsGenerating(true);
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onBeforePrint: () => {
      return new Promise<void>((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    pageStyle: `
      @page { 
        size: A4;
        margin: 10mm;
      }
      @media print {
        body { 
          -webkit-print-color-adjust: exact; 
        }
        .no-print, .print-hide { 
          display: none !important; 
        }
      }
    `,
    documentTitle: `Invoice_${studentName}_${new Date().toISOString().split('T')[0]}`,
    removeAfterPrint: false,
    onPrintError: (error) => {
      console.error('Print error:', error);
      setIsGenerating(false);
      toast.error('Failed to print. Please try again.');
    }
  });

  const buttonClasses = variant === 'text' 
    ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded' 
    : 'px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';

  return (
    <div className={className}>
      <div className="flex space-x-2">
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className={`inline-flex items-center ${buttonClasses} disabled:opacity-50`}
          type="button"
        >
          <Download className="h-4 w-4 mr-1.5" />
          {isGenerating ? 'Generating...' : variant === 'text' ? 'Download' : 'Download Invoice'}
        </button>
        
        <button
          onClick={handlePrint}
          disabled={isGenerating}
          className={`inline-flex items-center ${buttonClasses} disabled:opacity-50`}
          type="button"
        >
          <Printer className="h-4 w-4 mr-1.5" />
          {variant === 'text' ? 'Print' : 'Print Invoice'}
        </button>
      </div>

      {/* Hidden div for PDF generation */}
      <div className="hidden">
        <div ref={componentRef} className="p-6 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
});

export default InvoiceButton;
