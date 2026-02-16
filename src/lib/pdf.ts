// utils/pdf.ts
import pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

// Vissa bundlers exporterar vfs som pdfFonts.pdfMake.vfs, andra som pdfFonts.vfs
// Den här raden hanterar båda varianterna:
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? (pdfFonts as any).vfs;

type Underhall = {
  id: string;
  rubrik: string | null;
  status: "planerat" | "pågående" | "klart";
  planerat_datum: string | null; // YYYY-MM-DD
};

function formatSv(dateStrOrObj: string | Date) {
  const d =
    typeof dateStrOrObj === "string"
      ? new Date(dateStrOrObj + "T00:00:00")
      : dateStrOrObj;
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export async function generateWeeklyPlanPdf(opts: {
  user: { fornamn?: string; efternamn?: string; email?: string };
  items: Underhall[];
  week: number;
  start: Date;
  end: Date;
}) {
  const { user, items, week, start, end } = opts;

  const tableBody: any[] = [
    [
      { text: "Datum", style: "tableHeader" },
      { text: "Rubrik", style: "tableHeader" },
      { text: "Status", style: "tableHeader" },
    ],
  ];

  items.forEach((u) => {
    tableBody.push([
      u.planerat_datum ? formatSv(u.planerat_datum) : "—",
      u.rubrik || "(utan rubrik)",
      u.status,
    ]);
  });

  const docDefinition: any = {
    info: {
      title: `Underhållsplan – vecka ${week}`,
      author: `${user.fornamn ?? ""} ${user.efternamn ?? ""}`.trim(),
      subject: "Underhållsplan (personlig)",
    },
    pageSize: "A4",
    pageMargins: [40, 60, 40, 50],
    content: [
      { text: "Underhållsplan (personlig)", style: "title", margin: [0, 0, 0, 8] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: `Vecka ${week}`, style: "h2" },
              { text: `${formatSv(start)} – ${formatSv(end)}`, style: "muted", margin: [0, 2, 0, 0] },
            ],
          },
          {
            width: "auto",
            alignment: "right",
            stack: [
              { text: `${user.fornamn ?? ""} ${user.efternamn ?? ""}`.trim(), style: "h2" },
              user.email ? { text: user.email, style: "muted" } : {},
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1 }] },
      { text: " ", margin: [0, 6, 0, 0] },

      items.length === 0
        ? { text: "Inga personliga underhåll hittades denna vecka.", style: "muted", margin: [0, 10, 0, 0] }
        : {
            table: { headerRows: 1, widths: ["auto", "*", "auto"], body: tableBody },
            layout: { fillColor: (rowIndex: number) => (rowIndex === 0 ? "#f1f5f9" : null) },
            margin: [0, 10, 0, 0],
          },
    ],
    styles: {
      title: { fontSize: 18, bold: true, color: "#0f172a" },
      h2: { fontSize: 12, bold: true, color: "#0f172a" },
      muted: { fontSize: 10, color: "#475569" },
      tableHeader: { bold: true, color: "#0f172a" },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Utskriven: ${formatSv(new Date())}`, style: "muted", margin: [40, 0, 0, 0] },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", style: "muted", margin: [0, 0, 40, 0] },
      ],
      fontSize: 9,
    }),
  };

  (pdfMake as any).createPdf(docDefinition).download(`underhallsplan-vecka-${week}.pdf`);
}