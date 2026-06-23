import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { mockProfitAnalysis, mockProfitHistory } from '../services/mockData';
import {
  RefreshCw,
  FileText,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  Activity
} from 'lucide-react';

interface ProfitAnalysisPageProps {
  projectId: string;
  mockDataEnabled?: boolean;
}

const fmtVND = (n: number) => (isNaN(n) ? '0' : Math.round(n).toLocaleString('vi-VN'));

// ---------- Thống nhất quy chuẩn Design System Starbucks ----------
const panelStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0px 0px 0.5px 0px rgba(0,0,0,0.14), 0px 1px 1px 0px rgba(0,0,0,0.24)',
};

const labelStyle: React.CSSProperties = {
  fontSize: '1.15rem',
  fontWeight: '700',
  color: 'rgba(0, 0, 0, 0.58)',
  textTransform: 'uppercase',
  letterSpacing: '0.325px'
};

const sliceColors = [
  '#006241', // Starbucks Green
  '#cba258', // Gold
  '#2d5b8c', // Ocean Blue
  '#c82014', // Red
  '#7c3aed', // Purple
];

// ---------- 📊 1. BI WIDGET ENGINE: HỆ THỐNG ĐỒ HỌA TÀI CHÍNH HỢP NHẤT PHÓNG TO ----------
type UnifiedChartType = 'bar' | 'line' | 'donut';

interface UnifiedFinancialChartProps {
  budgetRevenue: number;
  actualRevenue: number;
  actualCost: number;
  netProfit: number;
  expensesList: { name: string; value: number; percent: number }[];
  delayedItems?: { name: string; delay_days: number }[];
}

const FinancialCompareChart: React.FC<UnifiedFinancialChartProps> = ({
  budgetRevenue,
  actualRevenue,
  actualCost,
  netProfit,
  expensesList,
  delayedItems
}) => {
  const [chartMode, setChartMode] = useState<UnifiedChartType>('bar');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [hoveredCircleIdx, setHoveredCircleIdx] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; title: string; value: string; color: string } | null>(null);

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Kích thước lớn trực quan như Sơ đồ Gantt
  const chartHeight = 320;
  const chartWidth = 550;
  const paddingLeft = 65;
  const paddingRight = 35;
  const paddingTop = 40;
  const paddingBottom = 45;

  const graphHeight = chartHeight - paddingTop - paddingBottom;
  const graphWidth = chartWidth - paddingLeft - paddingRight;

  const safeNum = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const bRev = safeNum(budgetRevenue);
  const aRev = safeNum(actualRevenue);
  const aCost = safeNum(actualCost);
  const nProfit = safeNum(netProfit);
  const maxValue = Math.max(bRev, aRev, aCost, 1) * 1.15; // avoid zero
  const yTicks = [0, maxValue * 0.25, maxValue * 0.5, maxValue * 0.75, maxValue];

  const compareItems = [
  { label: 'Doanh thu KH', value: budgetRevenue, color: '#cba258', key: 'budget' },
  { label: 'Doanh thu TT', value: actualRevenue, color: '#006241', key: 'actual' },
  { label: 'Chi phí TT', value: actualCost, color: '#c82014', key: 'cost' },
  { label: 'Lợi nhuận ròng', value: netProfit, color: netProfit >= 0 ? '#2d5b8c' : '#c82014', key: 'profit' },
  ];

  const spacing = graphWidth / (Math.max(compareItems.length - 1, 1));
  const linePointsPath = compareItems.map((item, idx) => {
    const val = safeNum(item.value);
    const x = paddingLeft + idx * spacing;
    const y = paddingTop + graphHeight - (maxValue > 0 ? (val / maxValue) * graphHeight : 0);
    return `${x},${isFinite(y) ? y : 0}`;
  }).join(' ');

  // Logic biểu đồ tròn (donut) - Phóng to
  const center = 275;
  const donutY = 160; // Căn giữa theo chiều dọc của SVG (320 / 2 = 160)
  const radius = 90;  // Tăng từ 65 lên 90 để vòng tròn to hơn
  const strokeWidth = 24; // Tăng độ rộng nét vẽ để hiển thị % rõ hơn
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = expensesList.map((item, idx) => {
    const strokeLength = (item.percent / 100) * circumference;
    const strokeOffset = circumference - (accumulatedPercent / 100) * circumference;
    accumulatedPercent += item.percent;
    const color = sliceColors[idx % sliceColors.length];
    return { ...item, color, strokeLength, strokeOffset };
  });

  const handleMouseMove = (e: React.MouseEvent, title: string, value: number, color: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 45,
      title,
      value: `${fmtVND(value)} đ`,
      color
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
    setHoveredKey(null);
    setHoveredCircleIdx(null);
  };

  const isNoExpenses = expensesList.length === 0 || actualCost === 0;

  // Render Area Gradient Path for line mode
  const areaPath = compareItems.map((item, idx) => {
    const x = paddingLeft + idx * spacing;
    const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
    return { x, y };
  });
  const closedAreaPath = areaPath.length > 0
    ? `${paddingLeft},${paddingTop + graphHeight} ${areaPath.map(p => `${p.x},${p.y}`).join(' ')} ${paddingLeft + (compareItems.length - 1) * spacing},${paddingTop + graphHeight}`
    : '';

  // Tính toán tọa độ hiển thị % trực tiếp trên cung tròn
  let currentStartAngle = -Math.PI / 2;
  const sliceTexts = slices.map((slice) => {
    const sweepAngle = (slice.percent / 100) * 2 * Math.PI;
    const middleAngle = currentStartAngle + sweepAngle / 2;
    const textRadius = radius;
    const x = center + textRadius * Math.cos(middleAngle);
    const y = donutY + textRadius * Math.sin(middleAngle);
    currentStartAngle += sweepAngle;
    return {
      percent: slice.percent,
      x,
      y,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', alignItems: 'center' }}>

      {/* Dropdown chọn loại biểu đồ */}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', borderBottom: '1px solid #f3f2f1', paddingBottom: '16px' }}>
        <select
          value={chartMode}
          onChange={(e) => setChartMode(e.target.value as UnifiedChartType)}
          style={{
            padding: '8px 16px', borderRadius: '50px', border: '1px solid #d6dbde',
            backgroundColor: '#ffffff', color: '#006241', fontSize: '1.25rem', fontWeight: '700', cursor: 'pointer', outline: 'none',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <option value="bar"> Biểu đồ cột</option>
          <option value="line">Biểu đồ đường </option>
          <option value="donut">Biểu tròn</option>
        </select>
      </div>

      {/* Layout chia làm 2 cột: Trái là Biểu đồ, Phải là Bảng chú thích thông tin (Cố định chiều cao tránh xê dịch) */}
      <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', width: '100%', alignItems: 'stretch', flexWrap: 'wrap' }}>

        {/* CỘT TRÁI: Biểu đồ SVG */}
        <div ref={containerRef} style={{ flex: '1 1 320px', maxWidth: '550px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'visible' }}>
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#006241" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#006241" stopOpacity="0.0" />
              </linearGradient>
              <filter id="shadowFilter" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.06" />
              </filter>
            </defs>

            {chartMode !== 'donut' && yTicks.map((tick, idx) => {
              const y = paddingTop + graphHeight - (tick / maxValue) * graphHeight;
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize="10" fill="rgba(0,0,0,0.45)" fontWeight="700">
                    {tick >= 1000000000 ? `${(tick / 1000000000).toFixed(1)}B` : tick >= 1000000 ? `${(tick / 1000000).toFixed(0)}M` : fmtVND(tick)}
                  </text>
                </g>
              );
            })}

            {/* CỘT */}
            {chartMode === 'bar' && compareItems.map((item, idx) => {
              const barWidth = 36;
              const currentSpacing = graphWidth / Math.max(compareItems.length, 1);
              const x = paddingLeft + idx * currentSpacing + (currentSpacing - barWidth) / 2;
              const val = safeNum(item.value);
              const barHeight = maxValue > 0 ? (val / maxValue) * graphHeight : 0;
              const y = paddingTop + graphHeight - (isFinite(barHeight) ? barHeight : 0);
              const isHovered = hoveredKey === item.key;

              return (
                <g
                  key={item.key}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={handleMouseLeave}
                  onMouseMove={(e) => handleMouseMove(e, item.label, item.value, item.color)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Background bar track */}
                  <rect
                    x={x}
                    y={paddingTop}
                    width={barWidth}
                    height={graphHeight}
                    fill="rgba(0,0,0,0.02)"
                    rx="6"
                  />
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(4, barHeight)}
                    fill={item.color}
                    rx="6"
                    filter="url(#shadowFilter)"
                    opacity={isHovered ? 1 : 0.85}
                    style={{ transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1), y 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease' }}
                  />
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill="#1E3932"
                    style={{ opacity: isHovered ? 1 : 0.8, transition: 'opacity 0.2s' }}
                  >
                    {item.value >= 1000000000 ? `${(item.value / 1000000000).toFixed(2)}B` : `${(item.value / 1000000).toFixed(0)}M`}
                  </text>
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - 14}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill={isHovered ? '#00754A' : 'rgba(0,0,0,0.58)'}
                    style={{ transition: 'fill 0.2s' }}
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}

            {/* ĐƯỜNG */}
            {chartMode === 'line' && (
              <g>
                <polygon
                  points={closedAreaPath}
                  fill="url(#areaGradient)"
                  style={{ transition: 'all 0.4s ease' }}
                />
                <path
                  d={`M ${areaPath.map(p => `${p.x},${p.y}`).join(' L ')}`}
                  fill="none"
                  stroke="#00754A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ transition: 'all 0.4s ease' }}
                />
                {compareItems.map((item, idx) => {
                  const x = paddingLeft + idx * spacing;
                  const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
                  const isHovered = hoveredKey === item.key;

                  return (
                    <g
                      key={item.key}
                      onMouseEnter={() => setHoveredKey(item.key)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={(e) => handleMouseMove(e, item.label, item.value, item.color)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 11 : 0}
                        fill={item.color}
                        opacity="0.15"
                        style={{ transition: 'r 0.2s ease, opacity 0.2s ease' }}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 7 : 5.5}
                        fill={item.color}
                        stroke="#ffffff"
                        strokeWidth="2.5"
                        filter="url(#shadowFilter)"
                        style={{ transition: 'all 0.15s' }}
                      />
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="800"
                        fill="#1E3932"
                        style={{ opacity: isHovered ? 1 : 0.8, transition: 'opacity 0.2s' }}
                      >
                        {item.value >= 1000000000 ? `${(item.value / 1000000000).toFixed(2)}B` : `${(item.value / 1000000).toFixed(0)}M`}
                      </text>
                      <text
                        x={x}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="700"
                        fill={isHovered ? '#00754A' : 'rgba(0,0,0,0.58)'}
                        style={{ transition: 'fill 0.2s' }}
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* TRÒN */}
            {chartMode === 'donut' && (
              <g>
                <circle cx={center} cy={donutY} r={radius} fill="transparent" stroke="#edebe9" strokeWidth={strokeWidth} />
                {isNoExpenses ? (
                  <circle cx={center} cy={donutY} r={radius} fill="transparent" stroke="#d6dbde" strokeWidth={strokeWidth} />
                ) : (
                  <>
                    {slices.map((slice, idx) => {
                      const isHovered = hoveredCircleIdx === idx;
                      return (
                        <circle
                          key={idx} cx={center} cy={donutY} r={radius} fill="transparent" stroke={slice.color}
                          strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                          strokeDasharray={`${slice.strokeLength} ${circumference}`}
                          strokeDashoffset={slice.strokeOffset}
                          transform={`rotate(-90 ${center} ${donutY})`}
                          style={{ transition: 'stroke-width 0.25s ease, stroke 0.25s ease', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredCircleIdx(idx)}
                          onMouseLeave={handleMouseLeave}
                          onMouseMove={(e) => handleMouseMove(e, slice.name, slice.value, slice.color)}
                        />
                      );
                    })}

                    {/* Hiển thị % trực tiếp trên biểu đồ */}
                    {sliceTexts.map((st, idx) => {
                      if (st.percent < 4) return null; // Bỏ qua nếu quá nhỏ tránh chồng chéo
                      return (
                        <text
                          key={idx}
                          x={st.x}
                          y={st.y + 4}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="800"
                          fill="#ffffff"
                          style={{ pointerEvents: 'none', transition: 'all 0.2s' }}
                        >
                          {st.percent.toFixed(0)}%
                        </text>
                      );
                    })}
                  </>
                )}

                {/* Central Donut Data Display */}
                <text x={center} y={donutY - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill="rgba(0,0,0,0.48)" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  TỔNG CHI PHÍ
                </text>
                <text x={center} y={donutY + 12} textAnchor="middle" fontSize="15" fontWeight="800" fill="#1E3932">
                  {fmtVND(actualCost)} đ
                </text>
              </g>
            )}
          </svg>

          {/* Floating Beautiful Interactive Tooltip */}
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                pointerEvents: 'none',
                zIndex: 10,
                transition: 'left 0.1s ease, top 0.1s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1.05rem', fontWeight: '700', color: 'rgba(0, 0, 0, 0.48)', whiteSpace: 'nowrap' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: tooltip.color }} />
                {tooltip.title.toUpperCase()}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1E3932' }}>
                {tooltip.value}
              </div>
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Bảng chi tiết thông tin tương ứng (Chiều cao cố định 320px bằng với biểu đồ để giữ cân bằng layout) */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '320px', borderLeft: '1px solid #edebe9', paddingLeft: '24px' }}>
          {chartMode === 'donut' ? (
            /* Thống kê Cơ cấu chi phí */
            <div style={{ width: '100%' }}>
              <h4 style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.48)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '16px' }}>
                Cơ cấu chi phí dự án
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {slices.map((slice, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', cursor: 'pointer',
                      opacity: hoveredCircleIdx === null || hoveredCircleIdx === idx ? 1 : 0.4, transition: 'all 0.2s',
                      padding: '6px 8px', borderRadius: '6px', backgroundColor: hoveredCircleIdx === idx ? 'rgba(0,0,0,0.04)' : 'transparent'
                    }}
                    onMouseEnter={() => setHoveredCircleIdx(idx)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: slice.color, flexShrink: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', overflow: 'hidden' }}>
                      <span style={{ fontWeight: '700', color: '#1E3932', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{slice.name}</span>
                      <span style={{ color: 'rgba(0,0,0,0.58)', fontWeight: '700', paddingLeft: '8px' }}>{slice.percent.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Thống kê Tổng hợp chỉ số tài chính */
            <div style={{ width: '100%' }}>
              <h4 style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.48)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '16px' }}>
                Tóm tắt chỉ số tài chính
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {compareItems.map((item) => (
                  <div
                    key={item.key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', cursor: 'pointer',
                      opacity: hoveredKey === null || hoveredKey === item.key ? 1 : 0.4, transition: 'all 0.2s',
                      padding: '6px 8px', borderRadius: '6px', backgroundColor: hoveredKey === item.key ? 'rgba(0,0,0,0.04)' : 'transparent'
                    }}
                    onMouseEnter={() => setHoveredKey(item.key)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', overflow: 'hidden' }}>
                      <span style={{ fontWeight: '700', color: '#1E3932', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.label}</span>
                      <span style={{ color: '#1E3932', fontWeight: '800', paddingLeft: '8px' }}>{fmtVND(item.value)} đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Biểu đồ phụ: Thống kê số ngày trễ tiến độ hạng mục */}
      {delayedItems && delayedItems.length > 0 && (
        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #edebe9', width: '100%', textAlign: 'left' }}>
          <h4 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#1E3932', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#c82014" />
            Thống kê số ngày trễ tiến độ hạng mục
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {delayedItems.map((item, idx) => {
              const maxDelay = Math.max(...delayedItems.map(d => d.delay_days), 1);
              const percent = Math.min(100, Math.max(8, (item.delay_days / maxDelay) * 100));
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: '700', color: '#1E3932' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <span style={{ color: '#c82014', fontWeight: '800', flexShrink: 0 }}>{item.delay_days} ngày</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', backgroundColor: '#f2f0eb', borderRadius: '50px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${percent}%`,
                        height: '100%',
                        backgroundColor: '#c82014',
                        borderRadius: '50px',
                        backgroundImage: 'linear-gradient(90deg, #c82014, #e53e3e)',
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

// ---------- Main Page Component ----------
export const ProfitAnalysisPage: React.FC<ProfitAnalysisPageProps> = ({ projectId, mockDataEnabled }) => {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadProfitInfo = async () => {
    setLoading(true);
    setError('');
    try {
      if (mockDataEnabled) {
        setData(mockProfitAnalysis);
        setHistory(mockProfitHistory);
      } else {
        const res = await api.getProfitAnalysis(projectId);
        setData(res.reportData);
        setHistory(res.history);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải phân tích lợi nhuận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
  if (!projectId) return;
  setLoading(true);
  setData(null);
  setHistory([]);
  loadProfitInfo();
  }, [projectId, mockDataEnabled]);

  const handleRunAnalysis = async () => {
    setError(''); setSuccess(''); setProcessing(true);
    try {
      if (mockDataEnabled) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSuccess('Đã tính toán lại dữ liệu Phân tích Lợi nhuận mẫu thành công!');
        setData(mockProfitAnalysis); setHistory(mockProfitHistory);
      } else {
        await api.runProfitAnalysis(projectId);
        setSuccess('Đã tính toán lại dữ liệu Phân tích Lợi nhuận thành công!');
        await loadProfitInfo();
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tính toán lợi nhuận');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={{ color: 'rgba(0,0,0,0.58)', fontSize: '1.3rem', padding: '20px' }}>Đang nạp phân tích tài chính...</div>;
  }

  const getExpensesList = () => {
    if (!data || !data.expenses) return [];
    return Object.entries(data.expenses)
      .map(([key, val]: [string, any]) => ({
        name: key,
        value: val,
        percent: data.total_expenses > 0 ? (val / data.total_expenses) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header chính */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #edebe9', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#006241', marginBottom: '6px', letterSpacing: '-0.16px' }}>Phân tích Lợi nhuận dự án</h1>
          <p style={{ fontSize: '1.3rem', color: 'rgba(0,0,0,0.58)', margin: 0 }}>Đối chiếu trực quan kế hoạch tài chính thực ca và chi phí phân bổ cho công trình.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px', backgroundColor: '#ffffff', color: '#00754A', border: '1px solid #00754A', borderRadius: '50px', fontWeight: '700', fontSize: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={handleRunAnalysis} disabled={processing}
          >
            <RefreshCw size={14} className={processing ? 'animate-spin' : ''} />
            {processing ? 'Đang phân tích...' : 'Tính toán lại lợi nhuận'}
          </button>
          {data && (
            <a
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px', backgroundColor: '#00754A', color: '#ffffff', border: 'none', borderRadius: '50px', fontWeight: '700', fontSize: '1.25rem', cursor: 'pointer', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,117,74,0.15)' }}
              href={api.getDownloadUrl(`master/${projectId}/profit_report.pdf`)} target="_blank" rel="noreferrer"
            >
              <FileText size={14} /> Tải Báo cáo (PDF)
            </a>
          )}
        </div>
      </div>

      {error && (
        <div style={{ ...panelStyle, background: 'rgba(200, 32, 20, 0.05)', borderColor: '#c82014', borderLeft: '4px solid #c82014', color: '#c82014', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <AlertTriangle size={16} /> <span><strong>Lỗi hệ thống:</strong> {error}</span>
        </div>
      )}
      {success && (
        <div style={{ ...panelStyle, background: '#d4e9e2', borderColor: '#00754A', borderLeft: '4px solid #00754A', color: '#1E3932', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
          <CheckCircle2 size={16} color="#00754A" /> <span><strong>Thành công:</strong> {success}</span>
        </div>
      )}

      {!data ? (
        <div style={{ ...panelStyle, textAlign: 'center', padding: '60px', color: 'rgba(0,0,0,0.58)', fontSize: '1.35rem' }}>
          <BarChart3 size={40} color="#666666" style={{ marginBottom: '12px' }} />
          <div>Chưa có cơ sở dữ liệu phân tích lợi nhuận. Vui lòng phát hành Đề nghị thanh toán trước.</div>
        </div>
      ) : (
        <>
          {/* Top level stats widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
            <div style={{ ...panelStyle, borderTop: '4px solid #006241' }}>
              <span style={gridLabelStyle}>Doanh thu thực tế (nghiệm thu)</span>
              <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#006241', margin: '8px 0', letterSpacing: '-0.5px' }}>{fmtVND(data.actual_revenue)} <span style={{ fontSize: '1.3rem', fontWeight: '600' }}>đ</span></div>
              <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>Hợp đồng KH: {fmtVND(data.budget_revenue)} đ</span>
            </div>

            <div style={{ ...panelStyle, borderTop: '4px solid #1E3932' }}>
              <span style={gridLabelStyle}>Tổng chi phí thực tế (Hóa đơn)</span>
              <div style={{ fontSize: '3.2rem', fontWeight: '800', color: '#1E3932', margin: '8px 0', letterSpacing: '-0.5px' }}>{fmtVND(data.total_expenses)} <span style={{ fontSize: '1.3rem', fontWeight: '600' }}>đ</span></div>
              <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>Từ {data.invoices_count} chứng từ hóa đơn</span>
            </div>

            <div style={{ ...panelStyle, borderTop: `4px solid ${data.net_profit >= 0 ? '#00754A' : '#c82014'}` }}>
              <span style={gridLabelStyle}>Lợi nhuận ròng dự án</span>
              <div style={{ fontSize: '3.2rem', fontWeight: '800', color: data.net_profit >= 0 ? '#00754A' : '#c82014', margin: '8px 0', letterSpacing: '-0.5px' }}>{fmtVND(data.net_profit)} <span style={{ fontSize: '1.3rem', fontWeight: '600' }}>đ</span></div>
              <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', fontWeight: 600 }}>Lợi nhuận gộp: {fmtVND(data.gross_profit)} đ</span>
            </div>

            <div style={{ ...panelStyle, borderTop: data.profit_flag === 'Đỏ' ? '4px solid #c82014' : '4px solid #00754A', backgroundColor: data.profit_flag === 'Đỏ' ? 'rgba(200, 32, 20, 0.02)' : '#ffffff' }}>
              <span style={{ ...gridLabelStyle, color: data.profit_flag === 'Đỏ' ? '#c82014' : 'rgba(0,0,0,0.58)' }}>Tỷ lệ biên lợi nhuận ròng</span>
              <div style={{ fontSize: '3.2rem', fontWeight: '800', color: data.profit_flag === 'Đỏ' ? '#c82014' : '#00754A', margin: '8px 0' }}>{data.net_margin.toFixed(1)}%</div>
              <span style={{ fontSize: '1.15rem', color: data.profit_flag === 'Đỏ' ? '#c82014' : '#00754A', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                {data.profit_flag === 'Đỏ' ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                {data.profit_flag === 'Đỏ' ? 'Dưới biên kỳ vọng!' : 'Đạt biên an toàn'}
              </span>
            </div>
          </div>

          {/* Breakdown Grid Layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>

            {/* Hộp biểu đồ trung tâm phóng to đa năng */}
            <div style={panelStyle}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1E3932', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                Trung tâm Phân tích & Mô phỏng Đồ họa Tài chính
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
                <FinancialCompareChart
                  budgetRevenue={data.budget_revenue}
                  actualRevenue={data.actual_revenue}
                  actualCost={data.total_expenses}
                  netProfit={data.net_profit}
                  expensesList={getExpensesList()}
                  delayedItems={data.delayed_items}
                />
              </div>
            </div>

            {/* KHỐI PHÂN TÍCH BIẾN ĐỘNG & RỦI RO TÀI CHÍNH NÂNG CAO */}
            <div style={panelStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #edebe9', paddingBottom: '12px' }}>
                <Activity size={18} color="#00754A" />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '850', color: '#1E3932', textTransform: 'uppercase', letterSpacing: '0.3px', margin: 0 }}>
                  Báo cáo Biến động & Kiểm toán Rủi ro Dòng tiền
                </h3>
              </div>

              {data.overrun_reasons && data.overrun_reasons.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ color: '#c82014', padding: '14px 18px', backgroundColor: 'rgba(200, 32, 20, 0.03)', borderLeft: '4px solid #c82014', borderRadius: '8px', fontSize: '1.3rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>Hệ thống phát hiện xung đột: Vượt ngân sách vật tư liên đới biên độ trễ ca thi công.</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {data.overrun_reasons.map((reason: string, idx: number) => {
                      const isVatTu = reason.includes('vật tư') || reason.includes('giá');
                      const alertColor = isVatTu ? '#c82014' : '#cba258';
                      const bgAlert = isVatTu ? 'rgba(200,32,20,0.01)' : 'rgba(203,162,88,0.02)';

                      return (
                        <div key={idx} style={{ padding: '16px 20px', backgroundColor: bgAlert, borderRadius: '8px', border: `1px solid ${isVatTu ? '#f5dad7' : '#f0e6d2'}`, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '4px', backgroundColor: alertColor }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: alertColor, padding: '2px 8px', borderRadius: '4px', backgroundColor: isVatTu ? 'rgba(200,32,20,0.06)' : 'rgba(203,162,88,0.08)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {isVatTu ? '🔴 Kiểm soát Chi phí' : '⚠️ Biến động Hiện trường'}
                            </span>
                            <span style={{ fontSize: '1.1rem', color: 'rgba(0,0,0,0.38)', fontWeight: 600 }}>Mã kiểm toán #ANL-{2600 + idx}</span>
                          </div>
                          <p style={{ fontSize: '1.25rem', lineHeight: '1.6', color: '#222222', margin: '0 0 12px 0', fontWeight: 550 }}>{reason}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#00754A', padding: '20px', backgroundColor: '#d4e9e2', borderLeft: '4px solid #00754A', borderRadius: '8px', fontSize: '1.3rem', fontWeight: '600', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '1.35rem', color: '#1E3932' }}>
                    <ShieldCheck size={16} color="#00754A" /> Sức khỏe tài chính: An toàn ổn định
                  </div>
                  <span>Dự án đang vận hành bám sát hạch toán dự phòng ngân sách ban đầu.</span>
                </div>
              )}
            </div>

          </div>

          {/* Lịch sử báo cáo kết xuất đã phát hành */}
          <div style={panelStyle}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1E3932', marginBottom: '16px' }}>Lịch sử phát hành Báo cáo Lợi nhuận định kỳ</h2>
            {history.length === 0 ? (
              <div style={{ fontSize: '1.25rem', color: 'rgba(0,0,0,0.58)', padding: '10px', textAlign: 'center' }}>Chưa ghi nhận lịch sử kết xuất lưu trữ báo cáo tài chính cho dự án này.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {history.map((hist, idx) => (
                  <div key={idx} style={{ padding: '14px 20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #edebe9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#006241', fontSize: '1.35rem' }}>Báo cáo Phân tích Lợi nhuận</div>
                      <span style={{ fontSize: '1.15rem', color: 'rgba(0,0,0,0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}><Calendar size={12} /> {hist.createdAt}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <a href={hist.excelUrl} target="_blank" rel="noreferrer" title="Mở bảng Excel chi tiết" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(0,117,74,0.05)', color: '#00754A' }}><FileSpreadsheet size={14} /></a>
                      <a href={hist.pdfUrl} target="_blank" rel="noreferrer" title="Tải tệp văn bản PDF" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(200,32,20,0.05)', color: '#c82014' }}><ArrowUpRight size={14} /></a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const gridLabelStyle = labelStyle;