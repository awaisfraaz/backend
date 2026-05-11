const ExcelJS = require('exceljs');
const supabase = require('../supabaseClient');
const mailjet = require('./mailer');

async function sendProfilesReport() {
  console.log('Running profiles report...');

  try {

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('profile_id,first_name,last_name,email,country,order_ring,order_card,local_balance,currency,GBP,EUR,USD')
      .order('profile_id', { ascending: true });

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      console.log('No profiles found');
      return;
    }

    // 2) Build Excel workbook in memory
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Profiles');

    // Use keys of first row as column headers
    const columns = Object.keys(profiles[0]);
    sheet.columns = columns.map(col => ({
      header: col,
      key: col,
      width: Math.max(
        col.length + 4,
        ...profiles.map(row => {
          const val = row[col];
          return val != null ? String(val).length + 2 : 6;
        })
      )
    }));

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2B3A67' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 24;

    // Add all profile rows
    profiles.forEach(profile => sheet.addRow(profile));

    // Define thin border style
    const thinBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

    // Apply borders and alternating row colors to all rows
    sheet.eachRow((row, rowNumber) => {
      row.eachCell(cell => {
        cell.border = thinBorder;
      });
      if (rowNumber > 1) {
        row.alignment = { vertical: 'middle' };
        if (rowNumber % 2 === 0) {
          row.eachCell(cell => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F4F8' }
            };
          });
        }
      }
    });

    // Auto-filter on header row
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    // 3) Write to buffer (no temp files)
    const buffer = await workbook.xlsx.writeBuffer();
    const base64File = Buffer.from(buffer).toString('base64');

    // 4) Send email with Excel attachment via Mailjet
    const request = mailjet
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MJ_SENDER_EMAIL,
              Name: 'Orukka Reports'
            },
            To: [
              {
                Email: 'finance@monesave.com'
              }
            ],
            Subject: `Daily Balance Report - ${new Date().toLocaleDateString('en-GB')}`,
            HTMLPart: `
              <h2>Daily Balance Report</h2>
            `,
            Attachments: [
              {
                ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                Filename: `profiles_${new Date().toISOString().slice(0, 10)}.xlsx`,
                Base64Content: base64File
              }
            ]
          }
        ]
      });

    const result = await request;
    console.log('Profiles report emailed successfully:', result.body.Messages[0].Status);

  } catch (err) {
    console.error('Scheduled report failed:', err.message);
  }
}

module.exports = sendProfilesReport;
