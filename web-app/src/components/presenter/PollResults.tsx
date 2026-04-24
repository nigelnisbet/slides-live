import React, { useState } from 'react';
import { PollActivity, PollResults as PollResultsType } from '../../types/activity';

// SlidesLive brand colors
const primaryBlue = '#3b82f6';
const primaryBlueDark = '#2563eb';

// Color palette for pie chart and bar chart
const chartColors = [
  '#3b82f6', // SlidesLive Blue
  '#10b981', // SlidesLive Green
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
];

type DisplayMode = 'bars' | 'bar-chart' | 'pie';

interface PollResultsProps {
  activity: PollActivity;
  results: PollResultsType | null;
}

export const PollResults: React.FC<PollResultsProps> = ({ activity, results }) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('bars');

  const totalVotes = results?.totalResponses || 0;
  const responses = results?.responses || [];

  // Calculate percentages
  const optionStats = activity.options.map((option, index) => {
    const count = (responses as number[])[index] || 0;
    const percentage = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
    return { option, count, percentage, color: chartColors[index % chartColors.length] };
  });

  // Find max for highlighting
  const maxCount = Math.max(...optionStats.map(s => s.count), 0);

  const renderToggleButtons = () => (
    <div style={styles.toggleContainer}>
      <button
        onClick={() => setDisplayMode('bars')}
        style={{
          ...styles.toggleButton,
          ...(displayMode === 'bars' ? styles.toggleButtonActive : {}),
        }}
        title="Horizontal Bars"
      >
        ☰
      </button>
      <button
        onClick={() => setDisplayMode('bar-chart')}
        style={{
          ...styles.toggleButton,
          ...(displayMode === 'bar-chart' ? styles.toggleButtonActive : {}),
        }}
        title="Bar Chart"
      >
        📊
      </button>
      <button
        onClick={() => setDisplayMode('pie')}
        style={{
          ...styles.toggleButton,
          ...(displayMode === 'pie' ? styles.toggleButtonActive : {}),
        }}
        title="Pie Chart"
      >
        🥧
      </button>
    </div>
  );

  const renderHorizontalBars = () => (
    <div className="space-y-4">
      {optionStats.map((stat, index) => {
        const isLeading = stat.count === maxCount && maxCount > 0;
        return (
          <div key={index} className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium" style={{ color: isLeading ? primaryBlue : '#374151' }}>
                {stat.option}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{stat.count} votes</span>
                <span className="text-lg font-bold" style={{ color: isLeading ? primaryBlue : '#1f2937' }}>
                  {stat.percentage.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${stat.percentage}%`,
                  background: isLeading
                    ? `linear-gradient(to right, ${primaryBlue}, ${primaryBlueDark})`
                    : 'linear-gradient(to right, #9ca3af, #6b7280)',
                }}
              >
                {stat.count > 0 && (
                  <div className="flex items-center justify-end h-full px-3 text-white font-semibold text-sm">
                    {stat.count}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderBarChart = () => {
    const maxPercentage = Math.max(...optionStats.map(s => s.percentage), 1);

    return (
      <div style={styles.barChartContainer}>
        <div style={{
          ...styles.barChartBars,
          // Adjust gap based on number of options
          gap: optionStats.length <= 4 ? '32px' : '20px',
        }}>
          {optionStats.map((stat, index) => {
            const heightPercent = maxPercentage > 0 ? (stat.percentage / maxPercentage) * 100 : 0;
            return (
              <div key={index} style={styles.barChartColumn}>
                {/* Fixed height section for value + bar */}
                <div style={styles.barChartTop}>
                  <div style={styles.barChartValue}>
                    {stat.percentage.toFixed(0)}%
                  </div>
                  <div style={styles.barChartBarWrapper}>
                    <div
                      style={{
                        ...styles.barChartBar,
                        height: `${heightPercent}%`,
                        backgroundColor: stat.color,
                      }}
                    />
                  </div>
                </div>
                {/* Labels below - can vary in height */}
                <div style={styles.barChartLabel} title={stat.option}>
                  {stat.option}
                </div>
                <div style={styles.barChartCount}>
                  {stat.count} votes
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    // Build conic-gradient for pie chart
    let currentAngle = 0;
    const gradientStops: string[] = [];

    optionStats.forEach((stat) => {
      const angle = (stat.percentage / 100) * 360;
      gradientStops.push(`${stat.color} ${currentAngle}deg ${currentAngle + angle}deg`);
      currentAngle += angle;
    });

    const pieGradient = gradientStops.length > 0
      ? `conic-gradient(${gradientStops.join(', ')})`
      : '#e5e7eb';

    return (
      <div style={styles.pieContainer}>
        <div style={styles.pieChartWrapper}>
          <div
            style={{
              ...styles.pieChart,
              background: totalVotes > 0 ? pieGradient : '#e5e7eb',
            }}
          />
        </div>
        <div style={styles.pieLegend}>
          {optionStats.map((stat, index) => (
            <div key={index} style={styles.legendItem}>
              <div
                style={{
                  ...styles.legendColor,
                  backgroundColor: stat.color,
                }}
              />
              <div style={styles.legendText}>
                <span style={styles.legendLabel}>{stat.option}</span>
                <span style={styles.legendValue}>
                  {stat.percentage.toFixed(1)}% ({stat.count})
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-800">Poll Results</h3>
          {renderToggleButtons()}
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: primaryBlue }}>{totalVotes}</div>
          <div className="text-sm text-gray-500">Total Votes</div>
        </div>
      </div>

      {totalVotes === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <p className="text-gray-600">Waiting for responses...</p>
        </div>
      ) : (
        <>
          {displayMode === 'bars' && renderHorizontalBars()}
          {displayMode === 'bar-chart' && renderBarChart()}
          {displayMode === 'pie' && renderPieChart()}
        </>
      )}

      {/* Real-time indicator */}
      {totalVotes > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Live updates enabled</span>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  toggleContainer: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '4px',
  },
  toggleButton: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  // Bar Chart styles
  barChartContainer: {
    padding: '20px 0',
  },
  barChartBars: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '24px',
    minHeight: '320px',
  },
  barChartColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    maxWidth: '120px',
    minWidth: '80px',
  },
  barChartTop: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '200px',
  },
  barChartValue: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#374151',
    marginBottom: '8px',
    height: '24px',
  },
  barChartBarWrapper: {
    width: '100%',
    flex: 1,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  barChartBar: {
    width: '60px',
    borderRadius: '6px 6px 0 0',
    transition: 'height 0.5s ease-out',
    minHeight: '4px',
  },
  barChartLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#374151',
    marginTop: '12px',
    textAlign: 'center',
    maxWidth: '120px',
    lineHeight: '1.3',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    hyphens: 'auto',
  },
  barChartCount: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  // Pie Chart styles
  pieContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '40px',
    padding: '20px 0',
    flexWrap: 'wrap',
  },
  pieChartWrapper: {
    position: 'relative',
  },
  pieChart: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    transition: 'all 0.5s ease-out',
  },
  pieLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    flexShrink: 0,
  },
  legendText: {
    display: 'flex',
    flexDirection: 'column',
  },
  legendLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  legendValue: {
    fontSize: '12px',
    color: '#6b7280',
  },
};
