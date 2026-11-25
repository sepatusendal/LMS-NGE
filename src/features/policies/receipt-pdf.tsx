import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { strokePath, type Signature } from "./schema";

// The signed receipt kept in Drive for each tutor. It records that the
// documents were received; it deliberately never says the tutor "agrees".

export interface ReceiptData {
  receiptNumber: string;
  packetTitle: string;
  packetVersion: number;
  fullName: string;
  tutorId: string | null;
  email: string;
  documents: {
    title: string;
    documentNumber: string | null;
    versionLabel: string | null;
    effectiveDate: string | null;
    pageCount: number;
    sha256: string;
  }[];
  checklistItems: string[];
  statement: string;
  acknowledgedAt: Date;
  userAgent: string | null;
  signature: Signature;
  logoDataUri: string;
}

const BRAND = "#4b60ac";
const INK = "#1e293b";
const MUTED = "#64748b";
const LINE = "#d9deea";

const styles = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingTop: 34, paddingBottom: 52, fontFamily: "Helvetica", fontSize: 9.5, color: INK },
  header: { flexDirection: "row", alignItems: "center", borderBottomWidth: 2, borderBottomColor: BRAND, paddingBottom: 10 },
  logo: { width: 112, height: 30, objectFit: "contain" },
  headerText: { marginLeft: "auto", alignItems: "flex-end" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 12.5, color: BRAND },
  subtitle: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  receiptNumber: { marginTop: 10, fontFamily: "Helvetica-Bold", fontSize: 10 },
  section: { marginTop: 10 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 10, color: BRAND, marginBottom: 5 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 92, color: MUTED },
  value: { flex: 1 },
  documentItem: { marginBottom: 5 },
  documentTitle: { fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 8.5, color: MUTED, marginTop: 1.5 },
  hash: { fontFamily: "Courier", fontSize: 7, color: MUTED, marginTop: 1.5 },
  checkRow: { flexDirection: "row", marginBottom: 3.5 },
  checkBox: { width: 10, height: 10, marginRight: 7, marginTop: 0.5 },
  // react-pdf needs fontSize next to lineHeight, or wrapped lines double-space.
  checkText: { flex: 1, fontSize: 9.5, lineHeight: 1.3 },
  statement: { borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8, fontSize: 9.5, lineHeight: 1.3 },
  confirmation: { fontSize: 9.5, lineHeight: 1.3, marginBottom: 5 },
  signatureBox: { marginTop: 6, width: 240, borderWidth: 1, borderColor: LINE, borderRadius: 4, padding: 8 },
  signatureName: { marginTop: 4, borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, fontFamily: "Helvetica-Bold" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: MUTED,
  },
});

const SIGNATURE_WIDTH = 222;
const SIGNATURE_MAX_HEIGHT = 74;

function formatDate(date: string | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

export function formatReceiptTimestamp(date: Date): string {
  const text = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
  return `${text} WIB`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function PolicyReceiptPdf({ data }: { data: ReceiptData }) {
  const { signature } = data;
  const scale = Math.min(SIGNATURE_WIDTH / signature.width, SIGNATURE_MAX_HEIGHT / signature.height);

  return (
    <Document title={`${data.receiptNumber} - ${data.fullName}`} author="PT NUFA GLOBAL EDUKASI">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {data.logoDataUri ? <Image src={data.logoDataUri} style={styles.logo} /> : null}
          <View style={styles.headerText}>
            <Text style={styles.title}>EMPLOYEE POLICY ACKNOWLEDGEMENT</Text>
            <Text style={styles.subtitle}>PT NUFA GLOBAL EDUKASI</Text>
          </View>
        </View>

        <Text style={styles.receiptNumber}>No. {data.receiptNumber}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identitas</Text>
          <Field label="Nama" value={data.fullName} />
          <Field label="Tutor ID" value={data.tutorId || "-"} />
          <Field label="Email" value={data.email} />
          <Field label="Paket dokumen" value={`${data.packetTitle} (versi ${data.packetVersion})`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dokumen yang diterima</Text>
          {data.documents.map((doc, index) => {
            const meta = [
              doc.documentNumber ? `No. ${doc.documentNumber}` : null,
              doc.versionLabel ? `Versi ${doc.versionLabel}` : null,
              doc.effectiveDate ? `Berlaku ${formatDate(doc.effectiveDate)}` : null,
              `${doc.pageCount} halaman`,
            ].filter(Boolean);
            return (
              <View key={doc.sha256 + index} style={styles.documentItem} wrap={false}>
                <Text style={styles.documentTitle}>
                  {index + 1}. {doc.title}
                </Text>
                <Text style={styles.meta}>{meta.join("  |  ")}</Text>
                <Text style={styles.hash}>SHA-256 {doc.sha256}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Poin yang dikonfirmasi</Text>
          {data.checklistItems.map((item, index) => (
            <View key={index} style={styles.checkRow} wrap={false}>
              <Svg style={styles.checkBox} viewBox="0 0 10 10">
                <Path d="M 0.5 0.5 H 9.5 V 9.5 H 0.5 Z" stroke={BRAND} strokeWidth={1} fill="none" />
                <Path d="M 2.2 5.2 L 4.2 7.2 L 7.9 2.8" stroke={BRAND} strokeWidth={1.4} fill="none" />
              </Svg>
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Pernyataan</Text>
          <Text style={styles.statement}>{data.statement}</Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Konfirmasi elektronik</Text>
          <Text style={styles.confirmation}>
            Pekerja di atas telah mengonfirmasi penerimaan dokumen yang tercantum pada waktu di bawah ini.
          </Text>
          <Field label="Waktu" value={formatReceiptTimestamp(data.acknowledgedAt)} />
          <Field
            label="Verifikasi"
            value="Login ke akun tutor dan tanda tangan yang digambar di layar (bukan tanda tangan elektronik tersertifikasi)."
          />
          <Field label="Perangkat" value={data.userAgent || "-"} />
          <View style={styles.signatureBox}>
            <Svg
              width={signature.width * scale}
              height={signature.height * scale}
              viewBox={`0 0 ${signature.width} ${signature.height}`}
            >
              {signature.strokes.map((stroke, index) => (
                <Path
                  key={index}
                  d={strokePath(stroke)}
                  stroke="#111827"
                  strokeWidth={2 / scale}
                  strokeLinecap="round"
                  fill="none"
                />
              ))}
            </Svg>
            <Text style={styles.signatureName}>{data.fullName}</Text>
            <Text style={styles.meta}>Tutor ID: {data.tutorId || "-"}</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>{data.receiptNumber}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
