import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function POST(req) {
  const body = await req.json();
  const client = body.client || 'Client';
  const numero = body.numero || 'F2026-001';
  const totalHT = body.totalHT || 1000;
  const totalTTC = totalHT * 1.2;
  const tva = totalTTC - totalHT;
  const date = new Date().toISOString().split('T')[0];
  const dateFacturX = date.replace(/-/g,'');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText(`FACTURE ${numero}`, { x: 50, y: 750, size: 20, font, color: rgb(0,0,0) });
  page.drawText(`Client: ${client}`, { x: 50, y: 700, size: 12, font: fontNormal });
  page.drawText(`Date: ${date}`, { x: 50, y: 680, size: 12, font: fontNormal });
  page.drawText(`Total HT: ${totalHT} EUR`, { x: 50, y: 620, size: 12, font: fontNormal });
  page.drawText(`TVA 20%: ${tva.toFixed(2)} EUR`, { x: 50, y: 600, size: 12, font: fontNormal });
  page.drawText(`Total TTC: ${totalTTC.toFixed(2)} EUR`, { x: 50, y: 560, size: 16, font });
  page.drawText(`Compatible Facturation Electronique 2026 - Factur-X BASIC`, { x: 50, y: 100, size: 8, font: fontNormal });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocument>
    <ram:ID>${numero}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${dateFacturX}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${totalHT.toFixed(2)}</ram:LineTotalAmount>
        <ram:GrandTotalAmount>${totalTTC.toFixed(2)}</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  pdfDoc.setTitle(`Facture ${numero} - Factur-X`);
  const xmlBytes = new TextEncoder().encode(xml);
  await pdfDoc.attach(xmlBytes, 'factur-x.xml', { mimeType: 'text/xml', description: 'Factur-X' });

  const pdfBytes = await pdfDoc.save();

  return new Response(pdfBytes, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Facture-${numero}-Factur-X.pdf"`
    }
  });
}
