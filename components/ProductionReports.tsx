
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Card from './ui/Card';
import Button from './ui/Button';
import { formatDateSafe, formatDateTimeSafe } from '../utils/helpers';
import { ProductionIcon } from '../constants';
import ConfirmationModal from './ui/ConfirmationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const PrinterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm7-8V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

const ProductionReports: React.FC = () => {
    const navigate = useNavigate();
    const { productionReports, packs, deleteProductionReport } = useData();
    const [reportToDelete, setReportToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const handleDelete = async () => {
        if(reportToDelete) {
            try {
                await deleteProductionReport(reportToDelete, '');
            } catch(e) {
                console.error(e);
                alert("Error al eliminar el parte.");
            } finally {
                setReportToDelete(null);
            }
        }
    };

    const filteredReports = useMemo(() => {
        return productionReports.filter(report => {
            const pack = packs.find(p => p.id === report.packId);
            const term = searchTerm.toLowerCase();
            
            const reportIdMatch = report.id.toLowerCase().includes(term);
            const packOrderMatch = pack?.orderId.toLowerCase().includes(term);
            const packModelMatch = pack?.modelName.toLowerCase().includes(term);
            // Search by Expedition Lot
            const expeditionLotMatch = report.expeditionLot?.toLowerCase().includes(term);
            
            return reportIdMatch || packOrderMatch || packModelMatch || expeditionLotMatch;
        });
    }, [productionReports, packs, searchTerm]);

    const handlePrintPDF = (report: any, pack: any) => {
        const doc = new jsPDF();

        // CABECERA ESTILO EXCEL
        // Nº LANZAMIENTO
        doc.setFillColor(220, 252, 231); // Light green like the excel header
        doc.rect(14, 15, 182, 8, 'F'); // Background rect
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Nº LANZAMIENTO:", 16, 20);
        doc.text(pack ? pack.orderId : report.packId, 60, 20);

        // TABLA DE ARTICULO
        autoTable(doc, {
            startY: 25,
            head: [['Nº Artículo', 'Descripción Artículo', 'Lote', 'Cantidad Lanzada']],
            body: [
                [
                    pack?.modelId || '---', 
                    pack?.modelName || '---', 
                    pack?.contents?.[0]?.lot || '---', 
                    `${pack?.quantity || 0} ${pack?.quantity > 1 ? 'PACKS' : 'PACK'}` 
                ]
            ],
            theme: 'grid',
            headStyles: { fillColor: [220, 252, 231], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], lineColor: [0,0,0], lineWidth: 0.1 },
            styles: { fontSize: 9, cellPadding: 2 }
        });

        // BLOQUE CANTIDAD PRODUCIDA
        let finalY = (doc as any).lastAutoTable.finalY + 5;
        
        // Draw manual rects for "Cantidad Producida" and "Fecha" to mimic excel
        doc.setDrawColor(0);
        doc.rect(14, finalY, 182, 10); // Outer box
        
        doc.line(90, finalY, 90, finalY + 10); // Middle split
        doc.line(140, finalY, 140, finalY + 10); // Date split
        
        doc.setFontSize(9);
        doc.text("CANTIDAD PRODUCIDA:", 16, finalY + 6);
        doc.setFontSize(11);
        doc.text(`${report.producedQuantity}`, 92, finalY + 6);
        
        doc.setFontSize(9);
        doc.text("FECHA REALIZACIÓN:", 142, finalY + 6);
        doc.setFillColor(255, 255, 200); // Yellowish
        doc.rect(175, finalY + 1, 20, 8, 'F'); // Input area highlight
        doc.text(formatDateSafe(report.reportDate), 176, finalY + 6);

        // Lote Expedición line (if exists)
        if (report.expeditionLot) {
            finalY += 12;
            doc.setFontSize(9);
            doc.text(`LOTE EXPEDICIÓN: ${report.expeditionLot}`, 16, finalY);
        }

        // TABLA DE CONSUMOS
        finalY += report.expeditionLot ? 8 : 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bolditalic");
        doc.text("CONSUMOS REALIZADOS:", 14, finalY - 2);

        const tableBody = report.consumptions.map((c: any) => [
            c.name,
            c.lot || '',
            c.quantityConsumed,
            c.quantityWaste || ''
        ]);

        // Fill empty rows to look like the excel sheet
        for(let i=0; i < 10 - tableBody.length; i++) {
            tableBody.push(['', '', '', '']);
        }

        autoTable(doc, {
            startY: finalY,
            head: [['Nº Artículo / Descripción', 'Lote', 'Cantidad Consumidas', 'Cantidad mermas']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [220, 252, 231], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0,0,0], lineWidth: 0.1 },
            bodyStyles: { textColor: [0, 0, 0], lineColor: [0,0,0], lineWidth: 0.1 },
            styles: { fontSize: 9, cellPadding: 2 },
            columnStyles: {
                3: { fillColor: [255, 255, 224] } // Yellowish background for waste column
            }
        });

        doc.save(`Parte_Montaje_${report.id}.pdf`);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            {reportToDelete && <ConfirmationModal title="Eliminar Parte" message="¿Estás seguro? Esto no revertirá las mermas ya descontadas." onConfirm={handleDelete} onCancel={() => setReportToDelete(null)} />}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Partes de Montaje</h1>
                <Button onClick={() => navigate('/partes-montaje/nuevo')}>
                    <PlusIcon /> <span className="ml-2">Nuevo Parte de Montaje</span>
                </Button>
            </div>

            <Card className="mb-6">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por ID, Pedido, Modelo o Lote de Expedición..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500"
                    />
                </div>
            </Card>

            <div className="grid grid-cols-1 gap-6">
                {filteredReports.length > 0 ? (
                    filteredReports.map(report => {
                        const pack = packs.find(p => p.id === report.packId);
                        return (
                            <Card key={report.id} className="hover:shadow-md transition-shadow border border-gray-200">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <ProductionIcon />
                                            <h3 className="text-lg font-bold text-gray-900">{report.id}</h3>
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Fecha: {formatDateSafe(report.reportDate)} | Pack: {pack ? `${pack.orderId} (${pack.modelName})` : report.packId}
                                        </p>
                                        <div className="flex space-x-4 mt-2">
                                            <p className="text-sm text-gray-600">
                                                Producido: <strong>{report.producedQuantity}</strong> unidades
                                            </p>
                                            {report.expeditionLot && (
                                                <p className="text-sm text-blue-600">
                                                    Lote Exp: <span className="font-mono font-bold">{report.expeditionLot}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-4 md:mt-0 flex space-x-2">
                                        <Button onClick={() => navigate(`/partes-montaje/editar/${report.id}`)} variant="secondary" className="p-2" title="Editar">
                                            <EditIcon />
                                        </Button>
                                        <Button onClick={() => handlePrintPDF(report, pack)} className="bg-green-600 hover:bg-green-700 text-white p-2" title="Imprimir PDF">
                                            <PrinterIcon /> <span className="ml-2 hidden sm:inline">Imprimir</span>
                                        </Button>
                                        <Button variant="danger" className="p-2" onClick={() => setReportToDelete(report.id)} title="Eliminar">
                                            <TrashIcon/>
                                        </Button>
                                    </div>
                                </div>
                                
                                {/* Resumen rápido de mermas */}
                                {report.consumptions.some((c: any) => c.quantityWaste > 0) && (
                                    <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-2 rounded-r">
                                        <p className="text-xs font-bold text-red-800 uppercase mb-1">Mermas Registradas:</p>
                                        <ul className="list-disc list-inside text-xs text-red-700">
                                            {report.consumptions.filter((c: any) => c.quantityWaste > 0).map((c: any, idx: number) => (
                                                <li key={idx}>{c.name} ({c.lot}): {c.quantityWaste}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow border border-gray-200">
                        <ProductionIcon />
                        <h3 className="text-xl font-semibold text-gray-700 mt-4">No se encontraron partes de montaje</h3>
                        <p className="text-gray-500 mt-2">Intenta ajustar el criterio de búsqueda o crea un nuevo parte.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionReports;
