import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Inspection, ReconSheet, TransferReconSheet, VehicleChecklist, IncidentReport, VehicleExpense, RentalClient, getDocumentUrl } from './storage';

// Helper to download files in the browser
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export async function downloadInspectionPDF(inspection: Inspection, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('VEHICLE INSPECTION REPORT', { x: 50, y: height - 75, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    const details = [
      ['Booking Reference:', inspection.invoice_no, 'Inspection Type:', inspection.inspection_type.toUpperCase()],
      ['Vehicle Reg No:', inspection.vehicle_reg, 'Driver Name:', driverName],
      ['Vehicle Model:', inspection.is_rented_vehicle ? `${inspection.rented_vehicle_model || 'Rented Vehicle'}` : 'Owned Fleet', 'Inspection Date:', new Date(inspection.created_at).toLocaleDateString()],
      ['Current Mileage:', `${inspection.mileage_at_inspection} km`, 'Critical Faults:', inspection.has_critical_fault ? 'YES (ALERT SENT)' : 'NO']
    ];

    for (const row of details) {
      page.drawText(row[0], { x: 50, y, size: 10, font: boldFont });
      page.drawText(row[1], { x: 180, y, size: 10, font });
      page.drawText(row[2], { x: 340, y, size: 10, font: boldFont });
      page.drawText(row[3], { x: 460, y, size: 10, font, color: row[3].includes('YES') ? rgb(0.8, 0.1, 0.1) : rgb(0.2, 0.2, 0.2) });
      y -= 20;
    }

    y -= 15;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Checklist Items Table
    page.drawText('CHECKLIST STATUS', { x: 50, y, size: 12, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    // Draw table headers
    page.drawText('Item Description', { x: 60, y, size: 10, font: boldFont });
    page.drawText('Status', { x: 280, y, size: 10, font: boldFont });
    page.drawText('Fault Notes', { x: 380, y, size: 10, font: boldFont });
    
    page.drawRectangle({ x: 50, y: y - 4, width: 500, height: 18, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Item Description', { x: 60, y, size: 10, font: boldFont });
    page.drawText('Status', { x: 280, y, size: 10, font: boldFont });
    page.drawText('Fault Notes', { x: 380, y, size: 10, font: boldFont });
    
    y -= 20;

    const checklistKeys = Object.keys(inspection.checklist_json);
    for (const key of checklistKeys) {
      if (y < 120) {
        // Add new page
        page = pdfDoc.addPage([600, 800]);
        y = 750;
        page.drawText('INSPECTION REPORT - CONTINUED', { x: 50, y, size: 10, font: boldFont, color: rgb(0.5, 0.5, 0.5) });
        y -= 25;
      }

      const status = inspection.checklist_json[key];
      const fault = (inspection.faults_json && !Array.isArray(inspection.faults_json) && typeof inspection.faults_json === 'object')
        ? (inspection.faults_json as Record<string, string>)[key] || '-'
        : '-';
      const cleanKey = key.replace(/_/g, ' ').toUpperCase();

      page.drawText(cleanKey, { x: 60, y, size: 9, font });
      
      let statusColor = rgb(0.1, 0.6, 0.1); // Green
      if (status === 'fail' || status === 'fault') statusColor = rgb(0.8, 0.1, 0.1);
      if (status === 'flag') statusColor = rgb(0.8, 0.5, 0.1);
      
      page.drawText(status.toUpperCase(), { x: 280, y, size: 9, font: boldFont, color: statusColor });
      page.drawText(fault.substring(0, 35) + (fault.length > 35 ? '...' : ''), { x: 380, y, size: 9, font });

      y -= 18;
    }

    // Additional Notes
    if (inspection.notes) {
      if (y < 150) {
        page = pdfDoc.addPage([600, 800]);
        y = 750;
      }
      y -= 15;
      page.drawText('GENERAL NOTES / OBSERVATIONS', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
      y -= 18;
      page.drawText(inspection.notes, { x: 50, y, size: 10, font });
      y -= 20;
    }

    // Signature Area
    if (y < 220) {
      page = pdfDoc.addPage([600, 800]);
      y = 750;
    }
    
    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    page.drawText('DRIVER SIGNATURE & SIGN-OFF', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 60;

    const driverSigToUse = inspection.driver_signature || inspection.signature_url;
    if (driverSigToUse && driverSigToUse.startsWith('data:image')) {
      try {
        const sigImage = await pdfDoc.embedPng(driverSigToUse);
        page.drawImage(sigImage, {
          x: 50,
          y,
          width: 150,
          height: 50,
        });
      } catch (err) {
        page.drawRectangle({ x: 50, y, width: 150, height: 50, color: rgb(0.9, 0.9, 0.9) });
        page.drawText('Signature Authenticated', { x: 60, y: y + 20, size: 9, font: boldFont });
      }
    } else {
      page.drawRectangle({ x: 50, y, width: 150, height: 50, color: rgb(0.9, 0.9, 0.9) });
      page.drawText('Signature on file', { x: 60, y: y + 25, size: 9, font: boldFont });
      page.drawText(`Date: ${new Date(inspection.created_at).toLocaleDateString()}`, { x: 60, y: y + 10, size: 8, font });
    }

    page.drawText('I hereby certify that the above pre/post-trip safety checks', { x: 220, y: y + 30, size: 8, font });
    page.drawText('were completed diligently, and all recorded faults are accurate.', { x: 220, y: y + 18, size: 8, font });

    if (inspection.client_signature && inspection.client_signature.startsWith('data:image')) {
      y -= 80;
      if (y < 120) {
        page = pdfDoc.addPage([600, 800]);
        y = 750;
      }
      page.drawText('CLIENT SIGNATURE & SIGN-OFF', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
      y -= 60;
      try {
        const clientSigImage = await pdfDoc.embedPng(inspection.client_signature);
        page.drawImage(clientSigImage, {
          x: 50,
          y,
          width: 150,
          height: 50,
        });
      } catch (err) {
        page.drawRectangle({ x: 50, y, width: 150, height: 50, color: rgb(0.9, 0.9, 0.9) });
        page.drawText('Signature Authenticated', { x: 60, y: y + 20, size: 9, font: boldFont });
      }
      page.drawText('I hereby verify and acknowledge that the safety', { x: 220, y: y + 30, size: 8, font });
      page.drawText('compliance checks have been verified with the crew.', { x: 220, y: y + 18, size: 8, font });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `Inspection-${inspection.invoice_no}-${inspection.inspection_type}.pdf`);
  } catch (err) {
    console.error('pdf-lib generation failed, falling back to simple print layout:', err);
    window.print();
  }
}

export async function downloadReconPDF(recon: ReconSheet, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 850]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('WEEKLY TRIP RECONCILIATION SHEET', { x: 50, y: height - 75, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    const details = [
      ['Driver Name:', driverName, 'Week Period:', `${recon.week_start} to ${recon.week_end}`],
      ['Vehicle Reg:', recon.vehicle_reg, 'Tour Reference:', recon.tour_reference || 'N/A'],
      ['Start Mileage:', `${recon.start_km} km`, 'End Mileage:', `${recon.end_km} km`],
      ['Total Distance:', `${recon.total_distance_km} km`, 'Trips Completed:', `${recon.trips_completed}`],
      ['Total Hours:', `${recon.total_hours} hrs`, 'Sheet Status:', recon.status.toUpperCase()]
    ];

    for (const row of details) {
      page.drawText(row[0], { x: 50, y, size: 10, font: boldFont });
      page.drawText(row[1], { x: 160, y, size: 10, font });
      page.drawText(row[2], { x: 340, y, size: 10, font: boldFont });
      page.drawText(row[3], { x: 450, y, size: 10, font });
      y -= 18;
    }

    y -= 15;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Cost Breakdown table
    page.drawText('FINANCIAL TRIP EXPENSES BREAKDOWN', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    page.drawRectangle({ x: 50, y: y - 4, width: 500, height: 18, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Expense Description', { x: 60, y, size: 10, font: boldFont });
    page.drawText('Amount (ZAR)', { x: 420, y, size: 10, font: boldFont });
    
    y -= 20;

    // Add standard lines
    const baseLines = [
      { description: 'Trip Budget Allocation', amount: recon.trip_budget },
      { description: 'Driver Food Allowance', amount: recon.driver_food },
      { description: 'Driver Flights To/From', amount: recon.flights_to_from },
      { description: 'Driver Wage Rate Amount', amount: recon.driver_rate },
      { description: 'Accommodation Costs', amount: recon.accommodation }
    ];

    for (const line of baseLines) {
      page.drawText(line.description, { x: 60, y, size: 9, font });
      page.drawText(`R ${line.amount.toFixed(2)}`, { x: 420, y, size: 9, font });
      y -= 18;
    }

    // Add custom cost lines if any
    if (recon.cost_lines && recon.cost_lines.length > 0) {
      page.drawText('Custom Listed Expenses:', { x: 60, y, size: 9, font: boldFont });
      y -= 18;
      for (const line of recon.cost_lines) {
        page.drawText(line.description, { x: 80, y, size: 9, font });
        page.drawText(`R ${line.amount.toFixed(2)}`, { x: 420, y, size: 9, font });
        y -= 18;
      }
    }

    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 18;

    // Total Profit/Loss
    page.drawText('TOTAL NET PROFIT / LOSS:', { x: 50, y, size: 11, font: boldFont });
    page.drawText(`R ${recon.total_profit_loss.toFixed(2)}`, {
      x: 420,
      y,
      size: 11,
      font: boldFont,
      color: recon.total_profit_loss >= 0 ? rgb(0.1, 0.6, 0.1) : rgb(0.8, 0.1, 0.1)
    });
    y -= 25;

    // Wellness metrics
    if (y < 200) {
      page = pdfDoc.addPage([600, 850]);
      y = 800;
    }

    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    page.drawText('DRIVER WELLNESS & SAFETY STATS', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    page.drawText(`Fatigue Level: ${recon.fatigue_level} / 10`, { x: 60, y, size: 9, font });
    page.drawText(`Stress Level: ${recon.stress_level} / 10`, { x: 260, y, size: 9, font });
    y -= 18;

    const wellnessIssues = [
      ['Vehicle Issues:', recon.vehicle_issues],
      ['Accidents/Incidents:', recon.accidents_incidents],
      ['Traffic Violations:', recon.traffic_violations],
      ['Safety Concerns:', recon.safety_concerns],
      ['Maintenance Needed:', recon.maintenance_needed],
      ['Health Issues:', recon.health_issues]
    ];

    for (const item of wellnessIssues) {
      page.drawText(item[0], { x: 60, y, size: 9, font: boldFont });
      page.drawText(item[1] || 'None reported', { x: 200, y, size: 9, font });
      y -= 18;
    }

    // Sign off area
    y -= 25;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    page.drawText('DIRECTOR SIGN-OFF:', { x: 50, y, size: 11, font: boldFont });
    if (recon.director_sign_off) {
      page.drawText('APPROVED & SIGNED-OFF BY DIRECTOR', { x: 200, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
      page.drawText(`Date: ${recon.reviewed_at ? new Date(recon.reviewed_at).toLocaleDateString() : new Date().toLocaleDateString()}`, { x: 200, y: y - 15, size: 9, font });
    } else {
      page.drawText('PENDING DIRECTOR SIGN-OFF', { x: 200, y, size: 11, font: boldFont, color: rgb(0.8, 0.5, 0.1) });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `Recon-${recon.driver_id}-${recon.week_start}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    window.print();
  }
}

export async function downloadTransferReconPDF(recon: TransferReconSheet, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 850]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('WEEKLY TRANSFER PAYMENT RECONCILIATION', { x: 50, y: height - 75, size: 13, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    page.drawText('Driver Name:', { x: 50, y, size: 10, font: boldFont });
    page.drawText(driverName, { x: 150, y, size: 10, font });
    page.drawText('Week Period:', { x: 340, y, size: 10, font: boldFont });
    page.drawText(`${recon.week_start} to ${recon.week_end}`, { x: 450, y, size: 10, font });
    
    y -= 18;
    page.drawText('Recon Status:', { x: 50, y, size: 10, font: boldFont });
    page.drawText(recon.status.toUpperCase(), { x: 150, y, size: 10, font: boldFont, color: recon.status === 'reviewed' ? rgb(0.05, 0.58, 0.53) : rgb(0.8, 0.5, 0.1) });

    y -= 20;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 20;

    // Table
    page.drawText('COMPLETED PASSENGER TRANSFERS', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    page.drawRectangle({ x: 50, y: y - 4, width: 500, height: 18, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Date', { x: 55, y, size: 9, font: boldFont });
    page.drawText('Passenger Name', { x: 120, y, size: 9, font: boldFont });
    page.drawText('Route / Details', { x: 260, y, size: 9, font: boldFont });
    page.drawText('Ref Code', { x: 420, y, size: 9, font: boldFont });
    page.drawText('Amount', { x: 500, y, size: 9, font: boldFont });

    y -= 20;
    let totalAmount = 0;

    for (const tr of recon.transfers) {
      if (y < 100) {
        page = pdfDoc.addPage([600, 850]);
        y = 800;
      }

      page.drawText(tr.date || '', { x: 55, y, size: 8, font });
      page.drawText((tr.passenger_name || tr.description || 'Transfer Entry').substring(0, 18), { x: 120, y, size: 8, font });
      
      const routeText = (tr.vehicle_reg 
        ? `${tr.vehicle_reg} (${tr.tla_type || 'L'})` 
        : `${tr.pickup_location || 'N/A'} to ${tr.dropoff_location || 'N/A'}`
      ).substring(0, 28);
      page.drawText(routeText, { x: 260, y, size: 8, font });
      page.drawText((tr.invoice_or_tour_ref || '').substring(0, 12), { x: 420, y, size: 8, font });
      page.drawText(`R ${(tr.amount || 0).toFixed(2)}`, { x: 500, y, size: 8, font });
      
      totalAmount += tr.amount;
      y -= 16;
    }

    y -= 10;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 18;

    page.drawText('TOTAL RECONCILIATION EARNINGS:', { x: 50, y, size: 11, font: boldFont });
    page.drawText(`R ${totalAmount.toFixed(2)}`, { x: 500, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });

    // Review details
    y -= 30;
    if (recon.status === 'reviewed') {
      page.drawText(`Reviewed & approved by: ${recon.reviewed_by || 'Director'}`, { x: 50, y, size: 9, font });
      page.drawText(`Approved on: ${recon.reviewed_at ? new Date(recon.reviewed_at).toLocaleDateString() : new Date().toLocaleDateString()}`, { x: 50, y: y - 14, size: 9, font });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `TransferRecon-${recon.driver_id}-${recon.week_start}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    window.print();
  }
}

export async function downloadChecklistPDF(checklist: VehicleChecklist, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('PERIODIC VEHICLE CONDITION CHECKLIST', { x: 50, y: height - 75, size: 13, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    page.drawText('Driver Name:', { x: 50, y, size: 10, font: boldFont });
    page.drawText(driverName, { x: 150, y, size: 10, font });
    page.drawText('Week Period:', { x: 340, y, size: 10, font: boldFont });
    page.drawText(`${checklist.week_start} to ${checklist.week_end}`, { x: 450, y, size: 10, font });
    
    y -= 18;
    page.drawText('Current Mileage:', { x: 50, y, size: 10, font: boldFont });
    page.drawText(`${checklist.mileage} km`, { x: 150, y, size: 10, font });
    page.drawText('Submitted Date:', { x: 340, y, size: 10, font: boldFont });
    page.drawText(checklist.submitted_at ? new Date(checklist.submitted_at).toLocaleDateString() : 'N/A', { x: 450, y, size: 10, font });

    y -= 20;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    page.drawText('CORE SYSTEM CHECK STATUSES', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    page.drawRectangle({ x: 50, y: y - 4, width: 500, height: 18, color: rgb(0.95, 0.95, 0.95) });
    page.drawText('Check System / Component', { x: 60, y, size: 10, font: boldFont });
    page.drawText('Status Rating', { x: 420, y, size: 10, font: boldFont });
    
    y -= 20;

    const items = Object.entries(checklist.checklist_data);
    for (const [key, value] of items) {
      const cleanLabel = key.replace(/_/g, ' ').toUpperCase();
      page.drawText(cleanLabel, { x: 60, y, size: 9, font });
      
      let valColor = rgb(0.1, 0.6, 0.1);
      if (value === 'action') valColor = rgb(0.8, 0.1, 0.1);
      if (value === 'low') valColor = rgb(0.8, 0.5, 0.1);

      page.drawText(value.toUpperCase(), { x: 420, y, size: 9, font: boldFont, color: valColor });
      y -= 18;
    }

    if (checklist.notes) {
      y -= 10;
      page.drawText('DRIVER NOTES & OBSERVATIONS', { x: 50, y, size: 10, font: boldFont });
      y -= 15;
      page.drawText(checklist.notes, { x: 50, y, size: 9, font });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `Checklist-${checklist.driver_id}-${checklist.week_start}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    window.print();
  }
}

export async function downloadIncidentPDF(incident: IncidentReport, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('OFFICIAL INCIDENT REPORT', { x: 50, y: height - 75, size: 14, font: boldFont, color: rgb(0.8, 0.1, 0.1) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    const details = [
      ['Incident Reference:', incident.id || 'N/A', 'Report Date:', incident.created_at ? new Date(incident.created_at).toLocaleDateString() : 'N/A'],
      ['Vehicle Registration:', incident.vehicle_reg, 'Driver Name/ID:', driverName || incident.driver_id],
      ['Incident Type:', (incident.incident_type || '').toUpperCase(), 'Injuries Reported:', incident.injuries ? 'YES' : 'NO'],
      ['Location Details:', incident.location || 'Not Specified', 'Incident Status:', (incident.status || '').toUpperCase()]
    ];

    for (const row of details) {
      page.drawText(row[0], { x: 50, y, size: 10, font: boldFont });
      page.drawText(row[1], { x: 180, y, size: 10, font });
      page.drawText(row[2], { x: 340, y, size: 10, font: boldFont });
      page.drawText(row[3], { x: 460, y, size: 10, font, color: row[3] === 'YES' || row[3] === 'REPORTED' ? rgb(0.8, 0.1, 0.1) : rgb(0.2, 0.2, 0.2) });
      y -= 22;
    }

    y -= 15;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    // Description Section
    page.drawText('DETAILED DESCRIPTION', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    // Simple word wrap for description
    const words = (incident.description || '').split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + word).length > 80) {
        lines.push(line);
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line) lines.push(line);

    for (const descLine of lines) {
      page.drawText(descLine, { x: 50, y, size: 9, font });
      y -= 15;
    }

    // Admin Notes
    if (incident.admin_notes) {
      y -= 15;
      page.drawText('ADMINISTRATOR REVIEWS & NOTES', { x: 50, y, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
      page.drawText(incident.admin_notes, { x: 50, y, size: 9, font, color: rgb(0.3, 0.3, 0.3) });
      y -= 15;
    }

    // Signature/Review Sign-off
    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    page.drawText('INCIDENT VERIFICATION & RECORD', { x: 50, y, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText('This report is digitally archived and filed in compliance with Inyathi transport security protocols.', { x: 50, y, size: 8, font });
    page.drawText(`Filing Timestamp: ${incident.created_at ? new Date(incident.created_at).toLocaleString() : new Date().toLocaleString()}`, { x: 50, y: y - 12, size: 8, font });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `IncidentReport-${incident.vehicle_reg}-${incident.incident_type}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    window.print();
  }
}

export async function downloadExpensePDF(expense: VehicleExpense, driverName: string) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Draw Header
    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText('VEHICLE EXPENSE & DAMAGE RECORD', { x: 50, y: height - 75, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Details Grid
    let y = height - 120;
    const details = [
      ['Expense ID:', expense.id || 'N/A', 'Expense Date:', expense.expense_date || 'N/A'],
      ['Vehicle Registration:', expense.vehicle_reg, 'Logged By Driver/ID:', driverName || expense.driver_id || 'System/Admin'],
      ['Expense Type:', (expense.expense_type || '').toUpperCase(), 'Total Amount:', `R ${Number(expense.amount).toFixed(2)}`],
      ['Status:', (expense.status || '').toUpperCase(), 'Submitted At:', expense.submitted_at ? new Date(expense.submitted_at).toLocaleDateString() : 'N/A']
    ];

    for (const row of details) {
      page.drawText(row[0], { x: 50, y, size: 10, font: boldFont });
      page.drawText(row[1], { x: 180, y, size: 10, font });
      page.drawText(row[2], { x: 340, y, size: 10, font: boldFont });
      page.drawText(row[3], { x: 460, y, size: 10, font, color: row[3] === 'APPROVED' ? rgb(0.1, 0.6, 0.1) : row[3].startsWith('R ') ? rgb(0.05, 0.58, 0.53) : rgb(0.2, 0.2, 0.2) });
      y -= 22;
    }

    y -= 15;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    // Description Section
    page.drawText('EXPENSE DESCRIPTION', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;

    const words = (expense.description || '').split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      if ((line + word).length > 80) {
        lines.push(line);
        line = word + ' ';
      } else {
        line += word + ' ';
      }
    }
    if (line) lines.push(line);

    for (const descLine of lines) {
      page.drawText(descLine, { x: 50, y, size: 9, font });
      y -= 15;
    }

    if (expense.rejection_reason) {
      y -= 15;
      page.drawText('REJECTION REASON', { x: 50, y, size: 11, font: boldFont, color: rgb(0.8, 0.1, 0.1) });
      y -= 18;
      page.drawText(expense.rejection_reason, { x: 50, y, size: 9, font, color: rgb(0.8, 0.1, 0.1) });
      y -= 15;
    }

    // Signature/Review Sign-off
    y -= 30;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    y -= 25;

    page.drawText('AUDIT CONTROL & FINANCIAL ARCHIVE', { x: 50, y, size: 11, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText('This financial entry is verified and approved as part of operations ledger records.', { x: 50, y, size: 8, font });
    page.drawText(`Filing Timestamp: ${expense.created_at ? new Date(expense.created_at).toLocaleString() : new Date().toLocaleString()}`, { x: 50, y: y - 12, size: 8, font });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `ExpenseRecord-${expense.vehicle_reg}-${expense.id}.pdf`);
  } catch (err) {
    console.error('PDF generation failed:', err);
    window.print();
  }
}


export async function downloadRentalClientPDF(client: RentalClient) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const profileType = client.profile_type === 'external_driver' ? 'EXTERNAL DRIVER PROFILE' : 'CLIENT / RENTER PROFILE';

    page.drawText('INYATHI FLEET MANAGEMENT', { x: 50, y: height - 50, size: 20, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    page.drawText(profileType, { x: 50, y: height - 75, size: 14, font: boldFont, color: rgb(0.2, 0.2, 0.2) });
    page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: 550, y: height - 90 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    let y = height - 125;
    const details = [
      ['Full Name:', client.full_name || 'N/A'],
      ['Phone:', client.phone || 'N/A'],
      ['Email:', client.email || 'N/A'],
      ['Address:', client.address || 'N/A'],
      ['Linked Client / Company:', client.linked_client_company || 'N/A'],
      ['Rental Agreement:', client.rental_agreement_filename || (client.rental_agreement_url ? 'Uploaded' : 'Not uploaded')],
      ['Created:', client.created_at ? new Date(client.created_at).toLocaleString() : 'N/A'],
      ['Last Updated:', client.updated_at ? new Date(client.updated_at).toLocaleString() : 'N/A'],
    ];

    for (const [label, value] of details) {
      page.drawText(label, { x: 50, y, size: 10, font: boldFont });
      page.drawText(String(value).substring(0, 70), { x: 190, y, size: 10, font });
      y -= 22;
    }

    y -= 10;
    page.drawText('NOTES', { x: 50, y, size: 11, font: boldFont, color: rgb(0.05, 0.58, 0.53) });
    y -= 20;
    const noteWords = (client.notes || 'No notes recorded.').split(' ');
    let line = '';
    for (const word of noteWords) {
      if ((line + word).length > 85) {
        page.drawText(line, { x: 50, y, size: 9, font });
        line = `${word} `;
        y -= 15;
      } else {
        line += `${word} `;
      }
    }
    if (line) page.drawText(line, { x: 50, y, size: 9, font });

    y -= 55;
    page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
    page.drawText('Generated for administrative records. ID/passport numbers are intentionally excluded.', { x: 50, y: y - 25, size: 8, font });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes] as BlobPart[], { type: 'application/pdf' });
    downloadBlob(blob, `RentalProfile-${client.full_name.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
  } catch (err) {
    console.error('Rental client PDF generation failed:', err);
    window.print();
  }
}
