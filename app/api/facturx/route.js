import { PDFDocument } from 'pdf-lib';

export async function POST(req) {
  const { client, numero, totalHT } = await req.json();
  const totalTTC = totalHT * 1.2;
  const tva = totalHT * 0.2;

  const xml = `<?xml version="1.0"?><rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"><rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter><ram:ID>urn:cen.eu:en16931:2017#compliant#urn:factur-x.eu:1p0:basic</ram:ID></ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext><rsm:ExchangedDocument><ram:ID>${numero}</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">20260904</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument><rsm:SupplyChainTradeTransaction><ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode><ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>${totalHT.toFixed(2)}</ram:LineTotalAmount><ram:TaxTotalAmount>${tva.toFixed(2)}</ram:TaxTotalAmount><ram:GrandTotalAmount>${totalTTC.toFixed(2)}</ram:GrandTotalAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation></ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595,842]);
  page.drawText(`Facture ${numero} - ${client}`, {x:50,y:750,size:18});
  page.drawText(`HT: ${totalHT} EUR | TVA: ${tva} EUR | TTC: ${totalTTC} EUR`, {x:50,y:700,size:12});
  page.drawText(`FACTUR-X 2026 Conforme`, {x:50,y:650,size:10});

  const xmlBytes = new TextEncoder().encode(xml);
  pdfDoc.attach(xmlBytes, 'factur-x.xml', { mimeType: 'text/xml', description: 'Factur-X' });

  const pdfBytes = await pdfDoc.save();
  return new Response(pdfBytes, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${numero}-Factur-X.pdf"` } });
}
