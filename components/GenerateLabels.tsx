import React, { useState, useEffect, useRef } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const PrintIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
    </svg>
);

const PdfIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);


const GenerateLabels: React.FC = () => {
  // State for reprint section
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for generic label section
  const [title, setTitle] = useState('Título de Etiqueta');
  const [line1, setLine1] = useState('Información adicional línea 1');
  const [line2, setLine2] = useState('Línea 2');
  const [qrContent, setQrContent] = useState('https://misolucionenvinos.com');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const labelPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (qrContent.trim()) {
      const encodedContent = encodeURIComponent(qrContent);
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encodedContent}&size=128x128&margin=0&bgcolor=ffffff`);
    } else {
      setQrCodeUrl('');
    }
  }, [qrContent]);

  const handleDownloadQR = async () => {
    if (!qrCodeUrl) return;

    try {
        const response = await fetch(qrCodeUrl);
        if (!response.ok) throw new Error('Network response was not ok.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'codigo-qr.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error downloading QR code:', error);
        alert('No se pudo descargar el código QR. Por favor, inténtelo de nuevo o guárdelo haciendo clic derecho sobre la imagen.');
    }
  };
  
  const handlePrintLabel = () => {
    if (!labelPreviewRef.current) return;

    const currentTitle = title;
    const currentLine1 = line1;
    const currentLine2 = line2;
    const currentQrUrl = qrCodeUrl;

    const printWindow = window.open('', '_blank', 'height=400,width=600');
    if (printWindow) {
        printWindow.document.write('<html><head><title>Imprimir Etiqueta</title>');
        printWindow.document.write(`
            <style>
                body { font-family: sans-serif; margin: 0; padding: 20px; }
                .label-container { 
                    border: 1px solid #333; 
                    padding: 15px; 
                    width: 350px; 
                    height: 180px;
                    margin: auto;
                    display: flex;
                    flex-direction: column;
                }
                .label-title { text-align: center; font-weight: bold; font-size: 1.1rem; margin-bottom: 1rem; }
                .label-content { flex-grow: 1; display: flex; align-items: flex-end; justify-content: space-between; }
                .label-text { font-size: 0.8rem; }
                .label-qr img { width: 96px; height: 96px; }
                 @media print {
                    body { -webkit-print-color-adjust: exact; color-adjust: exact; }
                    .label-container { border: 1px solid #333; }
                }
            </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(`
            <div class="label-container">
                <div class="label-title">${currentTitle}</div>
                <div class="label-content">
                    <div class="label-text">
                        <p>${currentLine1}</p>
                        <p>${currentLine2}</p>
                    </div>
                    <div class="label-qr">
                        ${currentQrUrl ? `<img src="${currentQrUrl}" alt="Código QR" />` : ''}
                    </div>
                </div>
            </div>
        `);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    }
  };
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Generación y Reimpresión de Etiquetas</h1>
        </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Reprint Section */}
        <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Reimprimir Etiqueta Existente</h2>
            <p className="text-sm text-gray-600 mb-4">Busca un pack o pallet por su identificador para volver a generar su etiqueta.</p>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar por ID, Pedido, Pallet o Producto</label>
                <div className="flex">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="EJ: PACK001, ALMA ATLANTICA, PALC"
                        className="flex-grow block w-full border-gray-300 rounded-l-md shadow-sm p-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <button className="bg-brand-yellow text-brand-dark p-2.5 rounded-r-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
                        <SearchIcon />
                    </button>
                </div>
            </div>

            <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4">Resultados de la Búsqueda</h3>
                <div className="text-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-500">No hay resultados para mostrar.</p>
                    <p className="text-xs text-gray-400 mt-1">Realice una búsqueda para comenzar.</p>
                </div>
            </div>
        </Card>

        {/* Generate Section */}
        <Card>
             <h2 className="text-xl font-semibold text-gray-800 mb-4">Generar Etiqueta Genérica con QR</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Form */}
                <form onSubmit={e => e.preventDefault()} className="space-y-4">
                    <h3 className="text-md font-semibold text-gray-800">Contenido de la Etiqueta</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título (centrado)</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Línea de texto 1</label>
                        <input type="text" value={line1} onChange={e => setLine1(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Línea de texto 2</label>
                        <input type="text" value={line2} onChange={e => setLine2(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Contenido para Código QR</label>
                        <textarea value={qrContent} onChange={e => setQrContent(e.target.value)} rows={3} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2"></textarea>
                    </div>
                </form>

                {/* Preview */}
                <div className="space-y-4">
                     <h3 className="text-md font-semibold text-gray-800">Vista Previa</h3>
                     <div ref={labelPreviewRef} className="border border-dashed border-gray-400 p-4 min-h-[200px] flex flex-col">
                        <div className="text-center font-bold text-lg mb-4">{title}</div>
                        <div className="flex-grow flex items-end justify-between">
                            <div className="text-sm text-gray-700">
                                <p>{line1}</p>
                                <p>{line2}</p>
                            </div>
                            <div className="w-24 h-24 flex-shrink-0">
                                {qrCodeUrl ? <img src={qrCodeUrl} alt="Código QR" className="w-full h-full" /> : <div className="w-full h-full bg-gray-200 animate-pulse"></div>}
                            </div>
                        </div>
                     </div>
                     <div className="space-y-3">
                         <Button onClick={handlePrintLabel} className="w-full">
                            <PrintIcon /> Imprimir Etiqueta
                         </Button>
                         <div className="grid grid-cols-2 gap-3">
                            <Button variant="secondary" onClick={handlePrintLabel} className="w-full">
                                <PdfIcon /> Guardar en PDF
                            </Button>
                            <Button variant="secondary" onClick={handleDownloadQR} className="w-full">
                                <DownloadIcon /> Descargar solo QR
                            </Button>
                         </div>
                     </div>
                </div>
             </div>
        </Card>
      </div>
    </div>
  );
};

export default GenerateLabels;