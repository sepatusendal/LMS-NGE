import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Svg,
  Path,
  Circle,
  LinearGradient,
  Defs,
  Stop,
  Rect,
} from "@react-pdf/renderer";
import type { StudentPeriodData } from "./schema";
import { MONTH_LABEL } from "./schema";

const BULLET = "•";
const DASH = "—";

const OBJECTIVES_LABEL: Record<string, string> = {
  YES: "Tercapai",
  PARTIALLY: "Sebagian",
  NO: "Perlu Perhatian",
};

// NUFA brand: blue #4b60ac, coral #f15c5d — plus a playful supporting palette
// for section accents. Status colors (green/amber/red) stay reserved for
// status meaning only, never decorative.
const C = {
  brand: "#4b60ac",
  brandSoft: "#edeff6",
  brandDark: "#334072",
  coral: "#f15c5d",
  coralSoft: "#fde9e9",
  sun: "#f5a524",
  sunSoft: "#fef3e0",
  sky: "#0ea5e9",
  skySoft: "#e6f6fd",
  grape: "#8b5cf6",
  grapeSoft: "#f1ecfd",
  green: "#16a34a",
  greenSoft: "#f0fdf4",
  amber: "#d97706",
  amberSoft: "#fffbeb",
  red: "#dc2626",
  redSoft: "#fef2f2",
  ink: "#1e293b",
  muted: "#64748b",
  line: "#e6e9f0",
  white: "#ffffff",
  cream: "#fffdf8",
};

const OBJ_COLOR: Record<string, { fg: string; bg: string }> = {
  YES: { fg: C.green, bg: C.greenSoft },
  PARTIALLY: { fg: C.amber, bg: C.amberSoft },
  NO: { fg: C.red, bg: C.redSoft },
};

// ── Section accent rotation — each section gets its own doodle + color so
// the report reads as a friendly storybook rather than a flat form. ──
const SECTION_THEME = {
  attendance: { color: C.sky, soft: C.skySoft },
  progress: { color: C.coral, soft: C.coralSoft },
  positive: { color: C.green, soft: C.greenSoft },
  improve: { color: C.amber, soft: C.amberSoft },
  meetings: { color: C.brand, soft: C.brandSoft },
  comments: { color: C.grape, soft: C.grapeSoft },
};

const styles = StyleSheet.create({
  page: {
    paddingBottom: 46,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: C.ink,
    backgroundColor: C.cream,
  },
  banner: {
    backgroundColor: C.white,
    paddingHorizontal: 28,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: { width: 108, height: 29, objectFit: "contain" },
  bannerRight: { marginLeft: "auto", alignItems: "flex-end" },
  bannerTitle: { color: C.brand, fontSize: 13, fontFamily: "Helvetica-Bold" },
  bannerSubtitle: { color: C.coral, fontSize: 8, marginTop: 1 },
  body: { paddingHorizontal: 28, paddingTop: 14 },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 12,
    padding: 14,
    backgroundColor: C.brand,
  },
  heroMascotWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroTextWrap: { flex: 1 },
  heroGreeting: { fontSize: 8.5, color: "#dbe3f7" },
  heroName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.white, marginTop: 1 },
  heroSub: { fontSize: 8, color: "#dbe3f7", marginTop: 3, lineHeight: 1.4, maxWidth: 340 },
  studentCard: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentMetaLabel: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  studentMetaValue: { fontSize: 9.5, color: C.ink, marginTop: 2, fontFamily: "Helvetica-Bold" },
  periodBadge: {
    backgroundColor: C.brand,
    color: C.white,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 9 },
  sectionIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.ink },
  sectionCaption: { fontSize: 7.5, color: C.muted, marginTop: 1 },
  statGrid: { flexDirection: "row", gap: 6, marginBottom: 8 },
  statCard: { flex: 1, borderRadius: 10, padding: 9, alignItems: "center" },
  statBig: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  statSm: { fontSize: 6.3, color: C.muted, marginTop: 3, textAlign: "center" },
  barTrack: { height: 9, backgroundColor: C.line, borderRadius: 5, overflow: "hidden" },
  barFill: { height: 9, borderRadius: 5 },
  row: { flexDirection: "row", marginBottom: 4, alignItems: "center" },
  label: { width: 108, color: C.muted, fontSize: 9 },
  value: { flex: 1, fontSize: 9.5, fontFamily: "Helvetica-Bold" },
  skillChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  skillChip: {
    fontSize: 8,
    backgroundColor: C.grapeSoft,
    color: C.grape,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  table: { borderRadius: 8, overflow: "hidden", border: `1pt solid ${C.line}` },
  tableHeader: { flexDirection: "row", backgroundColor: C.brand },
  tableRow: { flexDirection: "row", borderBottom: `1pt solid ${C.line}` },
  tableRowAlt: { backgroundColor: "#f8f9fd" },
  th: { padding: 6, fontFamily: "Helvetica-Bold", fontSize: 8, color: C.white },
  td: { padding: 6, fontSize: 8.5 },
  colDate: { width: 56 },
  colClass: { width: 78 },
  colTopic: { flex: 1 },
  colStatus: { width: 76 },
  statusChip: {
    alignSelf: "flex-start",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  insightCard: { borderRadius: 10, padding: 10, marginBottom: 8, flexDirection: "row" },
  insightIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flexShrink: 0,
  },
  insightBody: { flex: 1 },
  insightTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  insightItem: { fontSize: 8.7, lineHeight: 1.5, color: C.ink, marginBottom: 3 },
  commentBox: { backgroundColor: C.white, borderRadius: 10, borderWidth: 1, borderColor: C.line, padding: 12 },
  paragraph: { fontSize: 9.3, lineHeight: 1.6, marginBottom: 5, color: C.ink },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    backgroundColor: C.brandDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: { fontSize: 7, color: "#c7d0e5" },
});

// ───────────────────────── Doodle icon components ─────────────────────────
// Small flat-style SVG icons drawn by hand (no external assets) so the report
// keeps an illustrated, storybook feel while staying self-contained.

function IconCalendarCheck({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="3" y="4.5" width="18" height="16" rx="3" fill={color} />
      <Rect x="3" y="4.5" width="18" height="5" rx="2.5" fill={color} opacity={0.55} />
      <Path
        d="M8 13.5l2.4 2.4L16.5 10"
        stroke="#ffffff"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconTrophy({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M7 4h10v5a5 5 0 0 1-10 0V4z"
        fill={color}
      />
      <Path
        d="M7 5H4.5A2.5 2.5 0 0 0 3 9.2 5 5 0 0 0 7 11"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
      />
      <Path
        d="M17 5h2.5A2.5 2.5 0 0 1 21 9.2 5 5 0 0 1 17 11"
        stroke={color}
        strokeWidth={1.6}
        fill="none"
      />
      <Rect x="10.5" y="14" width="3" height="4" fill={color} />
      <Rect x="8" y="18" width="8" height="2.4" rx="1.2" fill={color} />
    </Svg>
  );
}

function IconBulb({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="9.5" r="6.5" fill={color} />
      <Rect x="9.3" y="15.5" width="5.4" height="2.4" rx="1" fill={color} />
      <Rect x="9.8" y="18.3" width="4.4" height="1.7" rx="0.8" fill={color} opacity={0.7} />
      <Path d="M12 5.5v4M9.7 8l2.3 2 2.3-2" stroke="#ffffff" strokeWidth={1.3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function IconTarget({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" fill={color} opacity={0.25} />
      <Circle cx="12" cy="12" r="6" fill={color} opacity={0.55} />
      <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
  );
}

function IconBook({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 5.5c2.5-1.3 5.3-1.3 8 0v13c-2.7-1.3-5.5-1.3-8 0v-13z" fill={color} />
      <Path d="M20 5.5c-2.5-1.3-5.3-1.3-8 0v13c2.7-1.3 5.5-1.3 8 0v-13z" fill={color} opacity={0.65} />
    </Svg>
  );
}

function IconChat({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 5.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.3a.5.5 0 0 1-.8-.4V16.5H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"
        fill={color}
      />
      <Circle cx="8.3" cy="11" r="1.1" fill="#ffffff" />
      <Circle cx="12" cy="11" r="1.1" fill="#ffffff" />
      <Circle cx="15.7" cy="11" r="1.1" fill="#ffffff" />
    </Svg>
  );
}

// Friendly sun-star mascot used in the hero card to greet the parent.
function Mascot({ size = 46 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Circle cx="30" cy="30" r="16" fill={C.sun} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <Rect
          key={deg}
          x="28.5"
          y="2"
          width="3"
          height="8"
          rx="1.5"
          fill={C.sun}
          transform={`rotate(${deg}, 30, 30)`}
        />
      ))}
      <Circle cx="24.5" cy="27" r="2.1" fill={C.brandDark} />
      <Circle cx="35.5" cy="27" r="2.1" fill={C.brandDark} />
      <Path
        d="M23 34c2.5 3 11.5 3 14 0"
        stroke={C.brandDark}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx="20" cy="31.5" r="2.3" fill={C.coral} opacity={0.55} />
      <Circle cx="40" cy="31.5" r="2.3" fill={C.coral} opacity={0.55} />
    </Svg>
  );
}

// Tiny confetti scatter — decorative only, kept clear of the logo so it
// never competes with the brand mark.
function Confetti() {
  const dots = [
    { x: 6, y: 6, r: 3, c: C.coral },
    { x: 22, y: 3, r: 2, c: C.sun },
    { x: 15, y: 16, r: 2.4, c: C.sky },
    { x: 32, y: 10, r: 2.6, c: C.grape },
    { x: 40, y: 2, r: 2, c: C.brand },
    { x: 4, y: 20, r: 2, c: C.sun },
  ];
  return (
    <Svg width={46} height={26} viewBox="0 0 46 26">
      {dots.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={0.85} />
      ))}
    </Svg>
  );
}

// Ribbon-seal badge that reacts to the attendance rate — a small reward
// sticker moment, the kind of detail that makes a report feel made-for-a-kid
// rather than a generic export.
function SealBadge({ rate }: { rate: number }) {
  const tier =
    rate >= 90
      ? { label: "LUAR BIASA!", color: C.coral }
      : rate >= 75
        ? { label: "KERJA BAGUS!", color: C.brand }
        : rate >= 50
          ? { label: "SEMANGAT TERUS!", color: C.sun }
          : { label: "AYO LEBIH RAJIN!", color: C.grape };
  return (
    <View style={{ alignItems: "center", width: 74 }}>
      <Svg width={62} height={70} viewBox="0 0 62 70">
        <Defs>
          <LinearGradient id="sealGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={tier.color} stopOpacity={1} />
            <Stop offset="1" stopColor={tier.color} stopOpacity={0.75} />
          </LinearGradient>
        </Defs>
        <Path d="M18 44l-6 20 12-5 6 9 6-9 12 5-6-20z" fill={tier.color} opacity={0.9} />
        <Circle cx="31" cy="27" r="23" fill="url(#sealGrad)" />
        <Circle cx="31" cy="27" r="23" fill="none" stroke="#ffffff" strokeWidth={1.6} strokeDasharray="3,3" />
        <Text
          x="31"
          y="24"
          textAnchor="middle"
          style={{ fontSize: 15, fontFamily: "Helvetica-Bold", fill: "#ffffff" }}
        >
          {`${rate}%`}
        </Text>
      </Svg>
      <Text style={{ fontSize: 6.6, fontFamily: "Helvetica-Bold", color: tier.color, marginTop: 2, textAlign: "center" }}>
        {tier.label}
      </Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  caption,
  theme,
}: {
  icon: React.ReactNode;
  title: string;
  caption?: string;
  theme: { color: string; soft: string };
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ ...styles.sectionIconWrap, backgroundColor: theme.soft }}>{icon}</View>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
    </View>
  );
}

function StatusChip({ value }: { value: "YES" | "PARTIALLY" | "NO" | null }) {
  if (!value) return <Text style={styles.td}>{DASH}</Text>;
  const c = OBJ_COLOR[value];
  return (
    <View style={styles.td}>
      <Text style={{ ...styles.statusChip, color: c.fg, backgroundColor: c.bg }}>
        {OBJECTIVES_LABEL[value]}
      </Text>
    </View>
  );
}

function InsightCard({
  icon,
  title,
  color,
  bg,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  bg: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ ...styles.insightCard, backgroundColor: bg }}>
      <View style={{ ...styles.insightIconWrap, backgroundColor: "#ffffff" }}>{icon}</View>
      <View style={styles.insightBody}>
        <Text style={{ ...styles.insightTitle, color }}>{title}</Text>
        {items.map((item, i) => (
          <Text style={styles.insightItem} key={i}>
            {BULLET} {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function ParentReportPdf({
  data,
  teacherComments,
  logoBase64,
}: {
  data: StudentPeriodData;
  teacherComments: string;
  logoBase64?: string;
}) {
  const periodLabel = `${MONTH_LABEL[data.periodMonth]} ${data.periodYear}`;
  const attendedCount = data.attendance.present + data.attendance.late;
  const total = data.attendance.total;
  const rate = total > 0 ? Math.round((attendedCount / total) * 100) : 0;
  const classNames = data.classes.map((c) => c.className).join(", ") || DASH;
  const gradeInfo = data.classes[0]
    ? `${data.classes[0].curriculumName ?? DASH}  ${BULLET}  ${data.classes[0].gradeLevel ?? DASH}`
    : DASH;

  const achievedCounts = data.teachingReports.reduce(
    (acc, r) => {
      if (r.objectivesAchieved) acc[r.objectivesAchieved] += 1;
      return acc;
    },
    { YES: 0, PARTIALLY: 0, NO: 0 } as Record<string, number>,
  );
  const totalObj = achievedCounts.YES + achievedCounts.PARTIALLY + achievedCounts.NO;
  const achievedRate = totalObj > 0 ? Math.round((achievedCounts.YES / totalObj) * 100) : 0;

  const highlights = data.teachingReports
    .map((r) => r.whatWentWell)
    .filter((v): v is string => Boolean(v?.trim()))
    .slice(0, 3);

  const improvements = data.teachingReports
    .map((r) => r.whatNeedsImprovement)
    .filter((v): v is string => Boolean(v?.trim()))
    .slice(0, 3);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header: kept on a plain white field so the NUFA mark never fights
            a colored background — the playfulness lives in confetti tucked
            in the corner and the gradient hero band right below it. */}
        <View style={styles.banner}>
          {logoBase64 ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={logoBase64} style={styles.logo} />
          ) : (
            <Text style={{ color: C.brand, fontFamily: "Helvetica-Bold", fontSize: 14 }}>
              NUFA Global Education
            </Text>
          )}
          <View style={styles.bannerRight}>
            <Confetti />
          </View>
        </View>

        <View style={styles.body}>
          {/* Solid brand background on purpose — react-pdf paints absolutely
              positioned siblings unreliably, so an overlaid gradient/decor
              Svg here risks hiding the mascot and copy behind it. Playful
              color still comes through via the mascot, seal badge and the
              confetti dots tucked in the header corner. */}
          <View style={styles.heroCard}>
            <View style={styles.heroMascotWrap}>
              <Mascot />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroGreeting}>Halo, Ayah &amp; Bunda! Yuk simak progres si kecil{"…"}</Text>
              <Text style={styles.heroName}>{data.studentName}</Text>
              <Text style={styles.heroSub}>
                Ini rangkuman keseruan belajar Bahasa Inggris ananda selama {periodLabel} {DASH} disusun
                otomatis dari catatan tutor supaya Ayah/Bunda gampang mengikuti perkembangannya.
              </Text>
            </View>
            <SealBadge rate={rate} />
          </View>

          <View style={styles.studentCard}>
            <View>
              <Text style={styles.studentMetaLabel}>Siswa</Text>
              <Text style={styles.studentMetaValue}>
                {data.studentName}
                {data.nis ? `  ${BULLET}  NIS ${data.nis}` : ""}
              </Text>
              <Text style={{ fontSize: 8.3, color: C.muted, marginTop: 4 }}>
                {data.schoolName}  {BULLET}  {classNames}  {BULLET}  {gradeInfo}
              </Text>
            </View>
            <Text style={styles.periodBadge}>{periodLabel}</Text>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon={<IconCalendarCheck color={SECTION_THEME.attendance.color} />}
              title="Kehadiran Bulan Ini"
              caption="Seberapa rajin ananda datang ke kelas"
              theme={SECTION_THEME.attendance}
            />
            <View style={styles.statGrid}>
              <View style={{ ...styles.statCard, backgroundColor: C.greenSoft }}>
                <Text style={{ ...styles.statBig, color: C.green }}>{rate}%</Text>
                <Text style={styles.statSm}>KEHADIRAN</Text>
              </View>
              <View style={{ ...styles.statCard, backgroundColor: C.brandSoft }}>
                <Text style={{ ...styles.statBig, color: C.brand }}>{data.attendance.present}</Text>
                <Text style={styles.statSm}>HADIR</Text>
              </View>
              <View style={{ ...styles.statCard, backgroundColor: C.sunSoft }}>
                <Text style={{ ...styles.statBig, color: C.amber }}>{data.attendance.late}</Text>
                <Text style={styles.statSm}>TERLAMBAT</Text>
              </View>
              <View style={{ ...styles.statCard, backgroundColor: C.skySoft }}>
                <Text style={{ ...styles.statBig, color: C.sky }}>{data.attendance.excused}</Text>
                <Text style={styles.statSm}>IZIN</Text>
              </View>
              <View style={{ ...styles.statCard, backgroundColor: C.redSoft }}>
                <Text style={{ ...styles.statBig, color: C.red }}>{data.attendance.absent}</Text>
                <Text style={styles.statSm}>ALPA</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <View style={{ ...styles.barFill, width: `${rate}%`, backgroundColor: C.green }} />
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon={<IconTrophy color={SECTION_THEME.progress.color} />}
              title="Pencapaian Pembelajaran"
              caption="Topik dan kemampuan yang sudah dilatih"
              theme={SECTION_THEME.progress}
            />
            <View style={styles.row}>
              <Text style={styles.label}>Pertemuan</Text>
              <Text style={styles.value}>{data.lessonsCompleted}x di periode ini</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Topik Tercapai</Text>
              <Text style={styles.value}>
                {totalObj > 0 ? `${achievedCounts.YES} dari ${totalObj} topik (${achievedRate}%)` : "Belum ada data"}
              </Text>
            </View>
            {data.skillsCovered.length > 0 && (
              <View>
                <Text style={{ ...styles.label, marginTop: 2 }}>Kemampuan Dilatih</Text>
                <View style={styles.skillChipRow}>
                  {data.skillsCovered.map((s) => (
                    <Text key={s} style={styles.skillChip}>
                      {s}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>

          {(highlights.length > 0 || improvements.length > 0) && (
            <View style={styles.section}>
              <SectionHeader
                icon={<IconBulb color={SECTION_THEME.positive.color} />}
                title="Sorotan dari Tutor"
                caption="Catatan personal dari kelas ananda"
                theme={SECTION_THEME.positive}
              />
              <InsightCard
                icon={<IconBulb color={C.green} size={12} />}
                title="Hal Positif yang Terlihat"
                color={C.green}
                bg={C.greenSoft}
                items={highlights}
              />
              <InsightCard
                icon={<IconTarget color={C.amber} size={12} />}
                title="Area yang Perlu Ditingkatkan"
                color={C.amber}
                bg={C.amberSoft}
                items={improvements}
              />
            </View>
          )}

          {data.teachingReports.length > 0 && (
            <View style={styles.section} wrap={false}>
              <SectionHeader
                icon={<IconBook color={SECTION_THEME.meetings.color} />}
                title="Rangkuman Pertemuan"
                caption="Apa saja yang dipelajari tiap sesi"
                theme={SECTION_THEME.meetings}
              />
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={{ ...styles.th, ...styles.colDate }}>Tanggal</Text>
                  <Text style={{ ...styles.th, ...styles.colClass }}>Kelas</Text>
                  <Text style={{ ...styles.th, ...styles.colTopic }}>Topik</Text>
                  <Text style={{ ...styles.th, ...styles.colStatus }}>Capaian</Text>
                </View>
                {data.teachingReports.map((r, i) => (
                  <View
                    style={i % 2 === 1 ? { ...styles.tableRow, ...styles.tableRowAlt } : styles.tableRow}
                    key={r.meetingId}
                  >
                    <Text style={{ ...styles.td, ...styles.colDate }}>{r.date}</Text>
                    <Text style={{ ...styles.td, ...styles.colClass }}>{r.className}</Text>
                    <Text style={{ ...styles.td, ...styles.colTopic }}>{r.topic}</Text>
                    <StatusChip value={r.objectivesAchieved} />
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section} wrap={false}>
            <SectionHeader
              icon={<IconChat color={SECTION_THEME.comments.color} />}
              title="Komentar & Rekomendasi Guru"
              caption="Ditulis khusus untuk ananda"
              theme={SECTION_THEME.comments}
            />
            <View style={styles.commentBox}>
              {teacherComments
                ? teacherComments
                    .split("\n")
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((paragraph, i) => (
                      <Text style={styles.paragraph} key={i}>
                        {paragraph}
                      </Text>
                    ))
                : <Text style={styles.paragraph}>Belum ada komentar dari guru untuk periode ini.</Text>}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Diterbitkan oleh NUFA Global Education {DASH} English Course  {BULLET}  Dibuat otomatis dari data
            operasional real-time
          </Text>
        </View>
      </Page>
    </Document>
  );
}
