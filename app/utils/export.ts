export interface ExportColumn {
  key: string
  header: string
}

const BRAND_GREEN: [number, number, number] = [22, 101, 52]
const BRAND_GREEN_LIGHT: [number, number, number] = [240, 253, 244]
const BRAND_NAME = 'JURUTANI'
const BRAND_TAGLINE = 'Platform Penyuluhan Digital Pertanian Indonesia'
const BRAND_CONTACT = 'si.jurutani@gmail.com  •  +62 856-6900-0010'

export async function exportToPdf(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  title: string
) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])

  const doc = new jsPDF({ orientation: 'landscape' })
  const pageW = doc.internal.pageSize.getWidth()

  // Brand header bar
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 0, pageW, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(BRAND_NAME, 12, 9)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(BRAND_TAGLINE, 40, 9)

  // Title
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 12, 24)

  // Meta
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 12, 30)
  doc.text(`Total: ${rows.length} data`, 12, 35)

  autoTable(doc, {
    startY: 40,
    head: [columns.map(c => c.header)],
    body: rows.map(row => columns.map(col => String(row[col.key] ?? '-'))),
    headStyles: {
      fillColor: BRAND_GREEN,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8
    },
    bodyStyles: { fontSize: 8, textColor: 50 },
    alternateRowStyles: { fillColor: BRAND_GREEN_LIGHT },
    margin: { left: 12, right: 12 },
    styles: { lineColor: [220, 230, 220], lineWidth: 0.1 },
    foot: [[{
      content: BRAND_CONTACT,
      colSpan: columns.length,
      styles: { fontSize: 7, textColor: 150, halign: 'center', fillColor: [248, 250, 248] }
    }]],
    footStyles: { fontSize: 7 }
  })

  doc.save(`${filename}.pdf`)
}

export async function exportToExcel(
  rows: Record<string, any>[],
  columns: ExportColumn[],
  filename: string,
  sheetName: string = 'Data'
) {
  const XLSX = await import('xlsx')

  const wsData = [
    columns.map(c => c.header),
    ...rows.map(row => columns.map(col => row[col.key] ?? ''))
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  ws['!cols'] = columns.map(() => ({ wch: 24 }))

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Add metadata sheet
  const meta = XLSX.utils.aoa_to_sheet([
    ['Platform', BRAND_NAME],
    ['Tagline', BRAND_TAGLINE],
    ['Kontak', BRAND_CONTACT],
    ['Nama File', filename],
    ['Dicetak', new Date().toLocaleString('id-ID')],
    ['Total Data', rows.length]
  ])
  XLSX.utils.book_append_sheet(wb, meta, 'Info')

  XLSX.writeFile(wb, `${filename}.xlsx`)
}
